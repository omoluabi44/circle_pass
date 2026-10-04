import json
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Payment, PaymentEvent, Payout, OrganizerWallet, WalletTransaction, PayoutWebhookEvent
from core.utils.paystack import validate_webhook_signature, verify_transaction
from core.utils.fulfillment import fulfill_order, fail_order
from api.serializers import OrderSerializer, TicketSerializer


class PaystackWebhookView(APIView):
    """
    POST /api/payments/paystack/webhook/
    Webhook endpoint for Paystack events.
    Must be idempotent.
    Handles: charge.success, charge.failed, transfer.success, transfer.failed, transfer.reversed
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Webhooks are authenticated via HMAC signature

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

        if not event_type:
            return Response(status=status.HTTP_200_OK)

        # ----------------------------------------
        # CHARGE EVENTS (ticket payments)
        # ----------------------------------------
        if event_type in ('charge.success', 'charge.failed'):
            reference = data.get('reference')
            if not reference:
                return Response(status=status.HTTP_200_OK)

            try:
                payment = Payment.objects.select_related('order').get(reference=reference)
            except Payment.DoesNotExist:
                return Response(status=status.HTTP_200_OK)

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
                return Response(status=status.HTTP_200_OK)

            if event_type == 'charge.success':
                if payment.status == 'SUCCESS':
                    payment_event.processed = True
                    payment_event.save(update_fields=['processed'])
                    return Response(status=status.HTTP_200_OK)

                try:
                    verification = verify_transaction(reference)
                except Exception:
                    return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                if verification.get('data', {}).get('status') == 'success':
                    with transaction.atomic():
                        payment = Payment.objects.select_for_update().get(pk=payment.pk)
                        if payment.status != 'SUCCESS':
                            payment.status = 'SUCCESS'
                            payment.paid_at = timezone.now()
                            payment.channel = verification['data'].get('channel', '')
                            payment.provider_data = verification['data']
                            payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
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

        # ----------------------------------------
        # TRANSFER EVENTS (organizer payouts)
        # ----------------------------------------
        if event_type in ('transfer.success', 'transfer.failed', 'transfer.reversed'):
            transfer_code = data.get('transfer_code') or data.get('id', '')
            reference = data.get('reference', '')

            # Look up payout by transfer_code first, fallback to reference
            payout = None
            if transfer_code:
                try:
                    payout = Payout.objects.get(paystack_transfer_code=transfer_code)
                except Payout.DoesNotExist:
                    pass
            if not payout and reference:
                try:
                    payout = Payout.objects.get(reference=reference)
                except Payout.DoesNotExist:
                    pass

            if not payout:
                # Unknown transfer, ignore gracefully
                return Response(status=status.HTTP_200_OK)

            # Idempotency: use transfer_code + event_type as unique key
            paystack_event_id = data.get('id', f"{transfer_code}-{event_type}")
            event_key = f"{event_type}-{paystack_event_id}"

            webhook_event, created = PayoutWebhookEvent.objects.get_or_create(
                event_id=event_key,
                defaults={
                    'payout': payout,
                    'event_type': event_type,
                    'raw_body': payload,
                }
            )

            if not created and webhook_event.processed:
                return Response(status=status.HTTP_200_OK)

            with transaction.atomic():
                payout = Payout.objects.select_for_update().get(pk=payout.pk)

                if event_type == 'transfer.success':
                    if payout.status != 'SUCCESSFUL':
                        payout.status = 'SUCCESSFUL'
                        payout.processed_at = timezone.now()
                        payout.save(update_fields=['status', 'processed_at', 'updated_at'])

                        # Update lifetime payout total on wallet (amount was already deducted from available_balance)
                        OrganizerWallet.objects.filter(pk=payout.wallet_id).update(
                            total_payouts=F('total_payouts') + payout.amount
                        )

                elif event_type in ('transfer.failed', 'transfer.reversed'):
                    new_status = 'FAILED' if event_type == 'transfer.failed' else 'REVERSED'
                    if payout.status not in ('FAILED', 'REVERSED', 'SUCCESSFUL'):
                        reason = data.get('reason', '') or data.get('gateway_response', '')
                        payout.status = new_status
                        payout.failure_reason = reason
                        payout.processed_at = timezone.now()
                        payout.save(update_fields=['status', 'failure_reason', 'processed_at', 'updated_at'])

                        # Refund the reserved amount back to available_balance
                        wallet = OrganizerWallet.objects.select_for_update().get(pk=payout.wallet_id)
                        OrganizerWallet.objects.filter(pk=wallet.pk).update(
                            available_balance=F('available_balance') + payout.amount
                        )
                        wallet.refresh_from_db()

                        WalletTransaction.objects.create(
                            wallet=wallet,
                            type='REVERSAL',
                            amount=payout.amount,
                            balance_after=wallet.available_balance,
                            reference=payout.reference,
                            description=f'Payout {new_status.lower()}: {reason}',
                            related_payout=payout,
                        )

                webhook_event.processed = True
                webhook_event.save(update_fields=['processed'])

            return Response(status=status.HTTP_200_OK)

        # Unhandled event type — return 200 so Paystack doesn't retry
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
