"""Re-send ticket emails for orders completed on a given day.

Used to recover from a delivery outage (e.g. a mail relay running out of
credits) without touching orders, tickets or payments.

    python manage.py resend_tickets --date 2026-11-10 --dry-run
    python manage.py resend_tickets --date 2026-11-10
    python manage.py resend_tickets --date 2026-11-10 --organizer-notifications
"""
from datetime import datetime, timedelta, timezone as dt_timezone

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.models import Order
from core.utils.notifications import (
    send_organizer_sales_notification,
    send_purchase_receipt,
)


class Command(BaseCommand):
    help = 'Re-send ticket emails for orders completed on a given UTC date.'

    def add_arguments(self, parser):
        parser.add_argument('--date', required=True, help='UTC date, YYYY-MM-DD')
        parser.add_argument(
            '--organizer-notifications', action='store_true',
            help='Also re-send the organizer "new ticket sale" notifications.',
        )
        parser.add_argument(
            '--orders', nargs='*', type=int,
            help='Optional subset of order IDs to resend.',
        )
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        try:
            day = datetime.strptime(options['date'], '%Y-%m-%d')
        except ValueError as exc:
            raise CommandError(f'Invalid --date: {exc}')

        start = timezone.make_aware(day, dt_timezone.utc)
        end = start + timedelta(days=1)

        orders = (
            Order.objects
            .filter(status='COMPLETED', updated_at__gte=start, updated_at__lt=end)
            .select_related('event', 'attendee__user')
            .order_by('id')
        )
        if options.get('orders'):
            orders = orders.filter(id__in=options['orders'])

        order_list = list(orders)
        if not order_list:
            self.stdout.write('No completed orders found for that date.')
            return

        dry_run = options['dry_run']
        self.stdout.write(
            f'{len(order_list)} completed order(s) on {options["date"]}'
            f'{" — DRY RUN" if dry_run else ""}'
        )

        ticket_emails = 0
        organizer_emails = 0
        for order in order_list:
            tickets = list(order.tickets.all())
            if not tickets:
                self.stdout.write(f'  order {order.id}: no tickets, skipped')
                continue

            buyer = (
                order.guest_email
                or (order.attendee.user.email if order.attendee else '')
                or ''
            ).strip().lower()
            recipients = sorted({
                (t.attendee_email or buyer).strip().lower()
                for t in tickets
                if (t.attendee_email or buyer)
            })

            if dry_run:
                self.stdout.write(
                    f'  order {order.id}: {len(tickets)} ticket(s) -> {", ".join(recipients)}'
                )
            else:
                send_purchase_receipt(order, tickets)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  order {order.id}: sent {len(tickets)} ticket(s) to '
                        f'{", ".join(recipients)}'
                    )
                )
            ticket_emails += len(recipients)

            if options.get('organizer_notifications'):
                if not dry_run:
                    send_organizer_sales_notification(order, tickets)
                organizer_emails += 1

        if dry_run:
            self.stdout.write(
                f'Would send {ticket_emails} ticket email(s)'
                + (f' and {organizer_emails} organizer notification(s)'
                   if options.get('organizer_notifications') else '')
            )
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Done: {ticket_emails} ticket email(s)'
                + (f' and {organizer_emails} organizer notification(s)'
                   if options.get('organizer_notifications') else '')
            ))
