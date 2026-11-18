"""Send the one-hour "checkout unfinished" reminder for recent abandoned orders.

The checkout queues this automatically; the command exists so a missed task can
be swept up (and so a one-off backfill can be run) without emailing the same
person twice — the order records when the reminder went out.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Order, Payment, Ticket


class Command(BaseCommand):
    help = 'Sends the checkout-reminder email for abandoned checkouts older than 1 hour.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--since-hours', type=int, default=168,
            help='Only consider orders created within this many hours (default 168).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='List recipients without sending anything.',
        )

    def handle(self, *args, **options):
        from api.tasks import send_abandoned_checkout_reminder

        now = timezone.now()
        cutoff = now - timedelta(hours=1)
        since = now - timedelta(hours=options['since_hours'])

        orders = (
            Order.objects.filter(
                checkout_reminder_sent_at__isnull=True,
                created_at__lte=cutoff,
                created_at__gte=since,
            )
            .exclude(status='COMPLETED')
            .exclude(total_amount__lte=0)
            .select_related('event', 'attendee__user')
            .order_by('created_at')
        )

        sent = skipped = 0
        for order in orders:
            if Ticket.objects.filter(order=order).exists():
                skipped += 1
                continue
            payment = Payment.objects.filter(order=order).first()
            if payment and payment.status == 'SUCCESS':
                skipped += 1
                continue

            recipient = order.guest_email or (
                order.attendee.user.email if order.attendee_id else ''
            )
            if not recipient:
                skipped += 1
                continue

            if options['dry_run']:
                self.stdout.write(f'[dry-run] order {order.id} -> {recipient}')
                continue

            result = send_abandoned_checkout_reminder(order.id)
            if str(result).startswith('Sent'):
                sent += 1
            else:
                skipped += 1
                self.stdout.write(f'order {order.id}: {result}')

        self.stdout.write(self.style.SUCCESS(
            f'Checkout reminders — sent: {sent}, skipped: {skipped}'
        ))
