"""
Tests for the one-tap "resend ticket email" endpoint used by Find My Ticket.

Delivery must reuse the purchase flow, so tickets only ever go to the address
they were issued to.
"""
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone

from core.models import (
    EmailLog, Event, Order, OrderItem, OrganizerProfile,
    Payment, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ResendTicketsEndpointTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # the resend throttle is per-IP and shared across tests

        org_user = User.objects.create_user(
            username='resendorg', email='resendorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Resend Test Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Resend Test Event', capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=500000, quantity=50,
        )
        self.order = Order.objects.create(
            event=self.event,
            guest_email='buyer@example.com',
            guest_name='Buyer Person',
            subtotal=500000,
            total_amount=525000,
            fee_amount=25000,
            status='COMPLETED',
        )
        OrderItem.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            quantity=2, unit_price=500000, line_total=1000000,
        )
        self.payment = Payment.objects.create(
            order=self.order, reference='PAY-RESEND-001',
            amount=525000, status='SUCCESS', provider='PAYSTACK',
        )
        self.ticket = Ticket.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            attendee_name='Buyer Person', attendee_email='buyer@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )

    def _resend(self, payload):
        return self.client.post(
            reverse('resend_tickets'), payload, content_type='application/json',
        )

    def test_resend_by_email_delivers_ticket(self):
        response = self._resend({'email': 'buyer@example.com'})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['sent'], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['buyer@example.com'])
        self.assertIn('Resend Test Event', mail.outbox[0].subject)
        self.assertTrue(
            EmailLog.objects.filter(recipient='buyer@example.com', status='Sent').exists()
        )

    def test_resend_by_reference_delivers_ticket(self):
        response = self._resend({'order_reference': 'PAY-RESEND-001'})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_only_reaches_the_issued_address(self):
        """A requester cannot redirect a ticket to an address they type in."""
        self.ticket.attendee_email = 'guest@example.com'
        self.ticket.attendee_name = 'Guest Person'
        self.ticket.save(update_fields=['attendee_email', 'attendee_name'])

        response = self._resend({'email': 'buyer@example.com'})

        self.assertEqual(response.status_code, 200, response.data)
        recipients = [address for message in mail.outbox for address in message.to]
        self.assertEqual(recipients, ['guest@example.com'])
        self.assertNotIn('attacker@example.com', recipients)

    def test_unknown_details_return_404(self):
        response = self._resend({'email': 'nobody@example.com'})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(len(mail.outbox), 0)

    def test_pending_order_is_not_resent(self):
        self.order.status = 'PENDING'
        self.order.save(update_fields=['status'])

        response = self._resend({'email': 'buyer@example.com'})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_criteria_rejected(self):
        response = self._resend({})
        self.assertEqual(response.status_code, 400)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AdminResendTicketEndpointTests(TestCase):
    """POST /api/admin/tickets/<pk>/ re-sends that order's ticket email."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()

        org_user = User.objects.create_user(
            username='adminresendorg', email='adminresendorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Admin Resend Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Admin Resend Event', capacity=50,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=100000, quantity=20,
        )
        self.order = Order.objects.create(
            event=self.event, guest_email='shopper@example.com',
            guest_name='Shopper Person', subtotal=100000,
            total_amount=105000, fee_amount=5000, status='COMPLETED',
        )
        self.ticket = Ticket.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            attendee_name='Shopper Person', attendee_email='shopper@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )

        self.admin = User.objects.create_user(
            username='resendadmin', email='resendadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )

    def _post(self, ticket_id):
        return self.client.post(f'/api/admin/tickets/{ticket_id}/', content_type='application/json')

    def test_admin_can_resend_a_pass(self):
        self.client.force_authenticate(user=self.admin)

        response = self._post(self.ticket.id)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['sent'], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['shopper@example.com'])

    def test_non_admin_cannot_resend(self):
        attendee = User.objects.create_user(
            username='plainuser', email='plain@example.com',
            password='password', role='ATTENDEE',
        )
        self.client.force_authenticate(user=attendee)

        response = self._post(self.ticket.id)

        self.assertIn(response.status_code, (401, 403))
        self.assertEqual(len(mail.outbox), 0)

    def test_pending_order_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        self.order.status = 'PENDING'
        self.order.save(update_fields=['status'])

        response = self._post(self.ticket.id)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_ticket_returns_404(self):
        self.client.force_authenticate(user=self.admin)
        response = self._post(999999)
        self.assertEqual(response.status_code, 404)
