"""
Management command: reconcile_payments

Checks recent orders with Paystack to catch payments where the user didn't click
'I have made the payment' in the Paystack modal, or where webhooks were missed/delayed.

Usage:
    python manage.py reconcile_payments --hours 168
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

from core.models import Order, Payment
from core.utils.paystack import verify_transaction
from core.utils.fulfillment import fulfill_order

logger = logging.getLogger(__name__)


def run_reconciliation(hours=168, stdout=None, style=None):
    cutoff = timezone.now() - timedelta(hours=hours)
    msg = f"Searching for unconfirmed payments since {cutoff} ({hours} hours)..."
    if stdout:
        stdout.write(msg)
    logger.info(msg)

    # 1. Check all payments whose order is NOT COMPLETED
    pending_payments = Payment.objects.filter(
        created_at__gte=cutoff
    ).exclude(
        order__status='COMPLETED'
    ).exclude(
        provider='FREE'
    ).select_related('order', 'order__event', 'order__attendee__user')

    total_checked = 0
    recovered_count = 0
    recovered_details = []

    for payment in pending_payments:
        if not payment.reference:
            continue

        total_checked += 1
        ref = payment.reference
        if stdout:
            stdout.write(f"Checking payment reference {ref} for Order #{payment.order_id}...")

        try:
            res = verify_transaction(ref)
            v_status = res.get('data', {}).get('status')

            if v_status == 'success':
                payment.status = 'SUCCESS'
                payment.paid_at = timezone.now()
                payment.channel = res['data'].get('channel', '')
                payment.provider_data = res['data']
                payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])

                tickets = fulfill_order(payment.order, payment=payment)
                recovered_count += 1

                attendee_email = payment.order.guest_email or (
                    payment.order.attendee.user.email if payment.order.attendee else 'N/A'
                )
                attendee_name = payment.order.guest_name or (
                    payment.order.attendee.user.get_full_name() if payment.order.attendee else 'N/A'
                )

                detail = {
                    'order_id': payment.order_id,
                    'reference': ref,
                    'attendee_name': attendee_name,
                    'attendee_email': attendee_email,
                    'event': payment.order.event.title if payment.order.event else 'N/A',
                    'tickets_issued': len(tickets),
                }
                recovered_details.append(detail)

                success_msg = f"Successfully recovered & fulfilled Order #{payment.order_id} for {attendee_email} ({len(tickets)} tickets issued)!"
                if stdout and style:
                    stdout.write(style.SUCCESS(success_msg))
                logger.info(success_msg)
            else:
                if stdout:
                    stdout.write(f"Reference {ref} is {v_status} on Paystack.")
        except Exception as e:
            err_msg = f"Error checking {ref}: {e}"
            if stdout and style:
                stdout.write(style.WARNING(err_msg))
            logger.warning(err_msg)

    # 2. Check orders where payment is SUCCESS but order is still PENDING or CANCELLED
    stuck_orders = Order.objects.filter(
        created_at__gte=cutoff,
        status__in=['PENDING', 'CANCELLED'],
        payment__status='SUCCESS'
    ).select_related('payment')

    for order in stuck_orders:
        try:
            pay = getattr(order, 'payment', None)
            tickets = fulfill_order(order, payment=pay)
            recovered_count += 1
            attendee_email = order.guest_email or (order.attendee.user.email if order.attendee else 'N/A')
            recovered_details.append({
                'order_id': order.id,
                'reference': getattr(pay, 'reference', 'N/A'),
                'attendee_email': attendee_email,
                'tickets_issued': len(tickets),
            })
            msg = f"Fulfilled stuck Order #{order.id} for {attendee_email}"
            if stdout and style:
                stdout.write(style.SUCCESS(msg))
            logger.info(msg)
        except Exception as e:
            logger.warning(f"Error fulfilling stuck order #{order.id}: {e}")

    summary = f"Finished payment reconciliation. Checked: {total_checked}, Recovered: {recovered_count}"
    if stdout and style:
        stdout.write(style.SUCCESS(summary))
    logger.info(summary)

    return {
        'total_checked': total_checked,
        'recovered_count': recovered_count,
        'recovered_details': recovered_details,
    }


class Command(BaseCommand):
    help = 'Reconciles unconfirmed Paystack payments and fulfills paid orders.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=168,
            help='Look back window in hours (default: 168 / 7 days).'
        )

    def handle(self, *args, **options):
        hours = options.get('hours', 168)
        run_reconciliation(hours=hours, stdout=self.stdout, style=self.style)
