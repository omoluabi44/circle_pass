import json
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Payment, PaymentEvent
from core.utils.paystack import validate_webhook_signature, verify_transaction
from core.utils.fulfillment import fulfill_order, fail_order
from api.serializers import OrderSerializer, TicketSerializer


class PaystackWebhookView(APIView):
    """
    POST /api/payments/paystack/webhook/
    Webhook endpoint for Paystack events.
    Must be idempotent.
    """
    permission_classes = [AllowAny]
    authentication_classes = [] # Webhooks are authenticated via HMAC signature

    def post(self, request):
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE')
        if not signature or not validate_webhook_signature(request.body, signature):
            return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return Response({'detail': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('event')
        data = payload.get('data', {})
        reference = data.get('reference')
        
        if not event_type or not reference:
            # Not enough info to process, but return 200 so Paystack stops retrying
            return Response(status=status.HTTP_200_OK)

        # Look up the Payment
        try:
            payment = Payment.objects.select_related('order').get(reference=reference)
        except Payment.DoesNotExist:
            # Unknown reference, can't do anything. Return 200.
            return Response(status=status.HTTP_200_OK)

        # Idempotency check: has this specific event been processed?
        # Sometimes Paystack doesn't send a unique event ID for everything, but they usually send an ID in the data.
        # We will use payload.get('data', {}).get('id') combined with event type, or fallback to hashing the payload.
        paystack_event_id = data.get('id', hash(request.body))
        event_key = f"{event_type}-{paystack_event_id}"

        payment_event, created = PaymentEvent.objects.get_or_create(
            payment=payment,
            event_id=event_key,
            defaults={
                'event_type': event_type,
                'raw_body': payload,
            }
        )

        if not created and payment_event.processed:
            # Already processed
            return Response(status=status.HTTP_200_OK)

        if event_type == 'charge.success':
            if payment.status == 'SUCCESS':
                payment_event.processed = True
                payment_event.save(update_fields=['processed'])
                return Response(status=status.HTTP_200_OK)

            # Double-verify with Paystack (defense-in-depth)
            try:
                verification = verify_transaction(reference)
            except Exception:
                # API error, we can retry later when Paystack sends another webhook
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if verification.get('data', {}).get('status') == 'success':
                with transaction.atomic():
                    # Re-fetch payment for update
                    payment = Payment.objects.select_for_update().get(pk=payment.pk)
                    if payment.status != 'SUCCESS':
                        payment.status = 'SUCCESS'
                        payment.paid_at = timezone.now()
                        payment.channel = verification['data'].get('channel', '')
                        payment.provider_data = verification['data']
                        payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])

                        # Fulfill order
                        fulfill_order(payment.order, payment=payment)

                    payment_event.processed = True
                    payment_event.save(update_fields=['processed'])
                    
        elif event_type == 'charge.failed':
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status == 'PENDING':
                    payment.status = 'FAILED'
                    payment.provider_data = payload
                    payment.save(update_fields=['status', 'provider_data', 'updated_at'])
                    fail_order(payment.order)
            payment_event.processed = True
            payment_event.save(update_fields=['processed'])

        return Response(status=status.HTTP_200_OK)


class PaymentVerifyView(APIView):
    """
    GET /api/payments/verify/?reference=...
    Frontend calls this after popup closes/redirects to check final status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        reference = request.query_params.get('reference')
        if not reference:
            return Response({'detail': 'Reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.select_related('order').get(reference=reference)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == 'SUCCESS':
            return Response({
                'status': 'SUCCESS',
                'order': OrderSerializer(payment.order).data,
                'tickets': TicketSerializer(payment.order.tickets.all(), many=True, context={'request': request}).data,
            })
        
        if payment.status == 'FAILED':
            return Response({
                'status': 'FAILED',
                'order': OrderSerializer(payment.order).data,
            })

        # Payment is still PENDING, verify manually
        try:
            verification = verify_transaction(reference)
        except Exception as e:
            return Response({'detail': f'Error verifying with provider: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        v_status = verification.get('data', {}).get('status')
        if v_status == 'success':
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status != 'SUCCESS':
                    payment.status = 'SUCCESS'
                    payment.paid_at = timezone.now()
                    payment.channel = verification['data'].get('channel', '')
                    payment.provider_data = verification['data']
                    payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
                    fulfill_order(payment.order, payment=payment)
            
            return Response({
                'status': 'SUCCESS',
                'order': OrderSerializer(payment.order).data,
                'tickets': TicketSerializer(payment.order.tickets.all(), many=True, context={'request': request}).data,
            })
            
        elif v_status in ['failed', 'abandoned']:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status == 'PENDING':
                    payment.status = 'FAILED'
                    payment.provider_data = verification['data']
                    payment.save(update_fields=['status', 'provider_data', 'updated_at'])
                    fail_order(payment.order)
            
            return Response({
                'status': 'FAILED',
                'order': OrderSerializer(payment.order).data,
            })

        return Response({
            'status': 'PENDING',
            'detail': 'Payment has not been completed yet.'
        })
