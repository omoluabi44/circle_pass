import json
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Payment, PaymentEvent, Payout, OrganizerWallet, WalletTransaction, PayoutWebhookEvent, PlatformSetting
from core.utils import nomba
from core.utils.gateway import verify_payment
from core.utils.paystack import validate_webhook_signature, verify_transaction
from core.utils.fulfillment import fulfill_order, fail_order
from api.permissions import IsAdmin
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


class NombaWebhookView(APIView):
    """
    POST /api/payments/nomba/webhook/
    Nomba sends signed events here (payment_success, payment_failed, ...).
    Signatures are verified and every delivery is idempotent.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Authenticated via HMAC signature

    def post(self, request):
        signature = (
            request.headers.get('nomba-signature')
            or request.META.get('HTTP_NOMBA_SIGNATURE')
        )
        timestamp = (
            request.headers.get('nomba-timestamp')
            or request.META.get('HTTP_NOMBA_TIMESTAMP')
        )

        try:
            payload = json.loads(request.body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response({'detail': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        if not nomba.validate_webhook_signature(payload, signature, timestamp):
            return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('event_type')
        data = payload.get('data') or {}
        order = data.get('order') or {}
        txn = data.get('transaction') or {}

        reference = (
            order.get('orderReference')
            or data.get('orderReference')
            or txn.get('merchantTxRef')
            or ''
        )
        if not reference:
            # Not a checkout event (virtual account transfer, payout, etc.)
            return Response(status=status.HTTP_200_OK)

        payment = Payment.objects.select_related('order').filter(reference=reference).first()
        if not payment:
            # Nomba sometimes reports its own generated order ID rather than the
            # reference we supplied; match that against the stored checkout data.
            nomba_order_id = order.get('orderId') or data.get('orderId') or ''
            if nomba_order_id:
                payment = (
                    Payment.objects.select_related('order')
                    .filter(provider='NOMBA', provider_data__orderReference=nomba_order_id)
                    .first()
                )
        if not payment:
            return Response(status=status.HTTP_200_OK)

        if payment.provider != 'NOMBA':
            # A Nomba event for an order paid through Paystack — ignore.
            return Response(status=status.HTTP_200_OK)

        event_key = (
            f"nomba-{payload.get('requestId')}"
            if payload.get('requestId')
            else f"nomba-{event_type}-{txn.get('transactionId') or reference}"
        )

        payment_event, created = PaymentEvent.objects.get_or_create(
            payment=payment,
            event_id=event_key,
            defaults={'event_type': event_type or '', 'raw_body': payload},
        )
        if not created and payment_event.processed:
            return Response(status=status.HTTP_200_OK)

        if event_type == 'payment_success':
            if payment.status == 'SUCCESS':
                payment_event.processed = True
                payment_event.save(update_fields=['processed'])
                return Response(status=status.HTTP_200_OK)

            # Never fulfil from the webhook alone: confirm with Nomba first.
            try:
                verification = verify_payment(payment)
            except Exception:
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if not verification['success']:
                # Ask Nomba to retry (the transaction may still be settling).
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status != 'SUCCESS':
                    payment.status = 'SUCCESS'
                    payment.paid_at = timezone.now()
                    payment.channel = verification.get('channel', '')
                    payment.provider_data = verification.get('data') or payload
                    payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
                    fulfill_order(payment.order, payment=payment)

                payment_event.processed = True
                payment_event.save(update_fields=['processed'])

            return Response(status=status.HTTP_200_OK)

        if event_type == 'payment_failed':
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

        # Unhandled event type — acknowledge so Nomba stops retrying.
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

        # Re-check with whichever gateway processed this payment. This also
        # revives payments previously marked FAILED when money later arrives.
        try:
            verification = verify_payment(payment)
        except Exception as e:
            if payment.status == 'FAILED':
                return Response({
                    'status': 'FAILED',
                    'order': OrderSerializer(payment.order).data,
                })
            return Response({'detail': f'Error verifying with provider: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        if verification['success']:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status != 'SUCCESS':
                    payment.status = 'SUCCESS'
                    payment.paid_at = timezone.now()
                    payment.channel = verification.get('channel', '')
                    payment.provider_data = verification.get('data') or {}
                    payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
                    fulfill_order(payment.order, payment=payment)

            payment.order.refresh_from_db()
            return Response({
                'status': 'SUCCESS',
                'order': OrderSerializer(payment.order).data,
                'tickets': TicketSerializer(payment.order.tickets.all(), many=True, context={'request': request}).data,
            })

        if verification['failed']:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if payment.status == 'PENDING':
                    payment.status = 'FAILED'
                    payment.provider_data = verification.get('data') or {}
                    payment.save(update_fields=['status', 'provider_data', 'updated_at'])
                    fail_order(payment.order)

            return Response({
                'status': 'FAILED',
                'order': OrderSerializer(payment.order).data,
            })

        # Still pending at the provider. Payments previously marked FAILED stay
        # failed for the buyer unless the provider confirms success above.
        if payment.status == 'FAILED':
            return Response({
                'status': 'FAILED',
                'order': OrderSerializer(payment.order).data,
            })

        return Response({
            'status': 'PENDING',
            'detail': 'Payment has not been completed yet.'
        })


class AdminPaymentGatewayView(APIView):
    """
    GET/PATCH /api/admin/settings/payment-gateway/
    Root admins pick which gateway processes new paid checkouts.
    Both gateways stay configured; only the active one is used.
    """
    permission_classes = [IsAdmin]

    def _payload(self):
        setting = PlatformSetting.get_solo()
        return {
            'gateway': setting.payment_gateway,
            'gateways': [
                {
                    'id': 'PAYSTACK',
                    'name': 'Paystack',
                    'configured': bool(getattr(settings, 'PAYSTACK_SECRET_KEY', '')),
                    'active': setting.payment_gateway == 'PAYSTACK',
                },
                {
                    'id': 'NOMBA',
                    'name': 'Nomba',
                    'configured': nomba.is_configured(),
                    'sandbox': str(getattr(settings, 'NOMBA_SANDBOX', False)).lower() in ('true', '1', 't'),
                    'active': setting.payment_gateway == 'NOMBA',
                },
            ],
            'updated_at': setting.updated_at,
        }

    def get(self, request):
        return Response(self._payload())

    def patch(self, request):
        gateway = (request.data.get('gateway') or request.data.get('payment_gateway') or '').upper()
        valid = {choice[0] for choice in PlatformSetting.GATEWAY_CHOICES}
        if gateway not in valid:
            return Response(
                {'detail': 'Select either PAYSTACK or NOMBA.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if gateway == 'NOMBA' and not nomba.is_configured():
            return Response(
                {'detail': 'Nomba credentials are missing on the server. Add the NOMBA_* environment variables first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if gateway == 'PAYSTACK' and not getattr(settings, 'PAYSTACK_SECRET_KEY', ''):
            return Response(
                {'detail': 'Paystack is not configured on the server.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        setting = PlatformSetting.get_solo()
        setting.payment_gateway = gateway
        setting.updated_by = request.user
        setting.save()

        return Response(self._payload())


class ReconcilePaymentsView(APIView):
    """
    GET /api/payments/reconcile/?hours=168
    POST /api/payments/reconcile/

    Scans Paystack for any unconfirmed payments in the last N hours,
    confirms receipt with Paystack API, creates tickets, dispatches emails,
    and returns a summary of all recovered orders.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return self._reconcile(request)

    def post(self, request):
        return self._reconcile(request)

    def _reconcile(self, request):
        import traceback
        try:
            try:
                hours = int(request.query_params.get('hours') or (request.data and request.data.get('hours')) or 168)
            except (ValueError, TypeError):
                hours = 168

            from core.management.commands.reconcile_payments import run_reconciliation
            result = run_reconciliation(hours=hours)
            return Response(result)
        except Exception as e:
            return Response({
                'error': str(e),
                'traceback': traceback.format_exc(),
            }, status=500)

