"""
Management command: reconcile_payments

Checks recent orders with Paystack to catch payments where the user didn't click
'I have made the payment' in the Paystack modal, or where webhooks were missed/delayed.

Usage:
    python manage.py reconcile_payments
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

from core.models import Order, Payment
from core.utils.paystack import verify_transaction
from core.utils.fulfillment import fulfill_order

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reconciles unconfirmed Paystack payments and fulfills paid orders.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=48,
            help='Look back window in hours (default: 48).'
        )

    def handle(self, *args, **options):
        hours = options.get('hours', 48)
        cutoff = timezone.now() - timedelta(hours=hours)

        self.stdout.write(f"Searching for unconfirmed payments since {cutoff} ({hours} hours)...")

        pending_payments = Payment.objects.filter(
            created_at__gte=cutoff,
            status__in=['PENDING', 'FAILED'],
            order__status__in=['PENDING', 'CANCELLED']
        ).select_related('order')

        total_checked = 0
        recovered_count = 0

        for payment in pending_payments:
            if not payment.reference or payment.provider == 'FREE':
                continue

            total_checked += 1
            ref = payment.reference
            self.stdout.write(f"Checking payment reference {ref} for Order #{payment.order_id}...")

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
                    self.stdout.write(self.style.SUCCESS(
                        f"Successfully recovered & fulfilled Order #{payment.order_id}! ({len(tickets)} tickets issued)"
                    ))
                else:
                    self.stdout.write(f"Reference {ref} is {v_status} on Paystack.")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Error checking {ref}: {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"Finished payment reconciliation. Checked: {total_checked}, Recovered: {recovered_count}"
        ))
