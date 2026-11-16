"""Admin per-tier CSV export used to reconcile ticket calculations."""
import csv
import io

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Event, Order, OrderItem, OrganizerProfile, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


class AdminTicketExportTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        org_user = User.objects.create_user(
            username='exportorg', email='exportorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Export Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Export Test Event',
            slug='export-test-event', capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.early = TicketType.objects.create(
            event=self.event, tier='EARLY_BIRD', name='Early Bird II',
            price=400000, quantity=20,
        )
        self.vip = TicketType.objects.create(
            event=self.event, tier='VIP', name='VIP', price=500000, quantity=20,
        )

        # ₦4,000 + ₦4,000 tickets plus a ₦400 fee -> ₦8,400 charged, ₦4,200 a pass.
        self.order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=800000,
            fee_amount=40000, total_amount=840000, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=self.order, ticket_type=self.early,
            quantity=2, unit_price=400000, line_total=800000,
        )
        Ticket.objects.create(
            order=self.order, ticket_type=self.early,
            attendee_name='Ada One', attendee_email='ada@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )
        Ticket.objects.create(
            order=self.order, ticket_type=self.early,
            attendee_name='Ada Two', attendee_email='ada2@example.com',
            status='USED', qr_token=generate_secure_qr_token(),
        )

        vip_order = Order.objects.create(
            event=self.event, guest_email='vip@example.com',
            subtotal=500000, total_amount=500000, status='COMPLETED',
        )
        Ticket.objects.create(
            order=vip_order, ticket_type=self.vip,
            attendee_name='Vip Person', attendee_email='vip@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )

        self.admin = User.objects.create_user(
            username='exportadmin', email='exportadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def _export(self, **params):
        return self.client.get(reverse('admin_ticket_export'), params)

    def _rows(self, response):
        text = b''.join(response.streaming_content).decode('utf-8-sig') \
            if response.streaming else response.content.decode('utf-8-sig')
        return list(csv.reader(io.StringIO(text)))

    def test_filters_to_a_single_tier(self):
        response = self._export(event_id=self.event.id, ticket_type_id=self.early.id)

        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])
        self.assertIn('attachment', response['Content-Disposition'])

        rows = self._rows(response)
        header_index = next(i for i, row in enumerate(rows) if row and row[0] == 'Order Number')
        body = rows[header_index + 1:]
        self.assertEqual(len(body), 2)
        self.assertTrue(all(row[3] == 'Early Bird II' for row in body))

    def test_summary_totals_match_the_tickets(self):
        response = self._export(event_id=self.event.id, ticket_type_id=self.early.id)
        rows = self._rows(response)

        summary = {row[0]: row[1] for row in rows if len(row) >= 2}
        self.assertEqual(summary['Ticket tier'], 'Early Bird II')
        self.assertEqual(summary['Tickets'], '2')
        self.assertEqual(summary['Distinct orders'], '1')
        self.assertEqual(summary['Gross at tier price (NGN)'], '8000.00')
        # ₦8,400 order split across two passes.
        self.assertEqual(summary['Amount paid by buyers (NGN)'], '8400.00')
        self.assertIn('ISSUED 1', summary['Status breakdown'])
        self.assertIn('USED 1', summary['Status breakdown'])

    def test_without_a_tier_filter_returns_every_ticket(self):
        response = self._export(event_id=self.event.id)
        rows = self._rows(response)

        summary = {row[0]: row[1] for row in rows if len(row) >= 2}
        self.assertEqual(summary['Tickets'], '3')
        self.assertEqual(summary['Distinct orders'], '2')

    def test_requires_admin(self):
        self.client.force_authenticate(user=None)

        self.assertIn(self._export().status_code, (401, 403))
