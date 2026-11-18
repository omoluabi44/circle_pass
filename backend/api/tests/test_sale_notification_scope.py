"""Resending a ticket is not a new sale.

The organizer's "New Ticket Sale!" email belongs to the moment a payment is
confirmed. Re-sending a ticket because the buyer never got it must not pretend
another ticket was sold, and one order must never produce the alert twice.
"""
import io
from datetime import timedelta

from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.views_find_ticket import resend_order_tickets
from core.models import (
    Event, Order, OrderItem, OrganizerProfile, Payment, Ticket, TicketType, User,
)
from core.utils.notifications import send_organizer_sales_notification
from core.utils.qr import generate_secure_qr_token

SALE_SUBJECT = 'New Ticket Sale'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SaleNotificationScopeTests(TestCase):
    def setUp(self):
        mail.outbox = []
        org_user = User.objects.create_user(
            username='saleorg', email='saleorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Sale Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Sale Scope Event', slug='sale-scope',
            capacity=100, notification_email='sales-inbox@example.com',
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=3),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=500000, quantity=50,
        )
        self.order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=500000, total_amount=525000,
            fee_amount=25000, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            quantity=1, unit_price=500000, line_total=500000,
        )
        Payment.objects.create(
            order=self.order, reference='PAY-SALE-SCOPE-1',
            amount=525000, status='SUCCESS', provider='PAYSTACK',
        )
        self.ticket = Ticket.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            attendee_name='Buyer Person', attendee_email='buyer@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )

    def _sale_emails(self):
        return [m for m in mail.outbox if SALE_SUBJECT in m.subject]

    # ── The alert belongs to a real sale ────────────────────────────────────
    def test_a_sale_notifies_the_organizer_once(self):
        send_organizer_sales_notification(self.order, [self.ticket])

        self.assertEqual(len(self._sale_emails()), 1)
        self.assertEqual(self._sale_emails()[0].to, ['sales-inbox@example.com'])
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.organizer_sale_notified_at)

    def test_the_same_order_never_notifies_twice(self):
        send_organizer_sales_notification(self.order, [self.ticket])
        send_organizer_sales_notification(self.order, [self.ticket])

        self.assertEqual(len(self._sale_emails()), 1)

    def test_an_unpaid_order_does_not_notify(self):
        self.order.status = 'PENDING'
        self.order.save(update_fields=['status'])

        send_organizer_sales_notification(self.order, [self.ticket])

        self.assertEqual(len(self._sale_emails()), 0)

    # ── Resends are delivery, not sales ─────────────────────────────────────
    def test_resending_a_ticket_does_not_notify_the_organizer(self):
        sent, failed, recipients = resend_order_tickets(self.order)

        self.assertEqual(sent, 1, (sent, failed, recipients))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['buyer@example.com'])
        self.assertEqual(len(self._sale_emails()), 0)
        self.order.refresh_from_db()
        self.assertIsNone(self.order.organizer_sale_notified_at)

    def test_the_public_resend_endpoint_does_not_notify_the_organizer(self):
        response = self.client.post(
            reverse('resend_tickets'), {'email': 'buyer@example.com'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(self._sale_emails()), 0)

    def test_the_admin_resend_button_does_not_notify_the_organizer(self):
        admin = User.objects.create_user(
            username='saleadmin', email='saleadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.post(
            reverse('admin_ticket_detail', kwargs={'pk': self.ticket.pk}),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(self._sale_emails()), 0)

    def test_the_resend_command_does_not_notify_the_organizer(self):
        out = io.StringIO()
        call_command(
            'resend_tickets',
            date=timezone.now().strftime('%Y-%m-%d'),
            stdout=out,
        )

        self.assertIn('Done', out.getvalue())
        self.assertEqual(len(self._sale_emails()), 0)
        self.assertTrue(
            any(m.to == ['buyer@example.com'] for m in mail.outbox),
            'the buyer should still receive the resent ticket',
        )