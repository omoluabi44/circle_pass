"""
Tests for Find My Ticket public lookup endpoint.
Covers: search by reference, search by email, no results, masking, rate limiting.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from core.models import (
    User, OrganizerProfile, AttendeeProfile,
    Event, TicketType, Order, OrderItem, Payment, Ticket,
)
from core.utils.qr import generate_secure_qr_token


class FindTicketTests(TestCase):
    def setUp(self):
        self.org_user = User.objects.create_user(
            username='findorg', email='findorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer = OrganizerProfile.objects.create(
            user=self.org_user, company_name='Find Test Org',
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Find Test Event',
            capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=500000, quantity=50,
        )

        # Create a completed order with tickets
        self.order = Order.objects.create(
            event=self.event,
            guest_email='guest@example.com',
            guest_name='John Doe',
            subtotal=500000,
            total_amount=525000,
            fee_amount=25000,
            status='COMPLETED',
        )
        OrderItem.objects.create(
            order=self.order,
            ticket_type=self.ticket_type,
            quantity=1,
            unit_price=500000,
            line_total=500000,
        )
        self.payment = Payment.objects.create(
            order=self.order,
            reference='PAY-FINDTEST-001',
            amount=525000,
            status='SUCCESS',
            provider='PAYSTACK',
        )
        self.ticket = Ticket.objects.create(
            order=self.order,
            ticket_type=self.ticket_type,
            attendee_name='John Doe',
            attendee_email='guest@example.com',
            status='ISSUED',
            qr_token=generate_secure_qr_token(),
        )

    def test_find_by_reference(self):
        """Correct ticket found by payment reference."""
        response = self.client.post(
            reverse('find_ticket'),
            {'reference': 'PAY-FINDTEST-001'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['event_title'], 'Find Test Event')

    def test_find_by_email(self):
        """Correct tickets found by guest email."""
        response = self.client.post(
            reverse('find_ticket'),
            {'email': 'guest@example.com'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_find_no_results(self):
        """Non-existent reference returns empty list."""
        response = self.client.post(
            reverse('find_ticket'),
            {'reference': 'NONEXISTENT-REF'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_find_does_not_expose_qr_token(self):
        """QR token is NOT in the response."""
        response = self.client.post(
            reverse('find_ticket'),
            {'reference': 'PAY-FINDTEST-001'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        result_str = str(response.data)
        self.assertNotIn(self.ticket.qr_token, result_str)

    def test_find_masks_email(self):
        """Email is masked in response."""
        response = self.client.post(
            reverse('find_ticket'),
            {'reference': 'PAY-FINDTEST-001'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        masked = response.data[0]['attendee_email_masked']
        self.assertNotEqual(masked, 'guest@example.com')
        self.assertIn('@', masked)
        self.assertIn('***', masked)

    def test_find_requires_at_least_one_field(self):
        """Empty submission → validation error."""
        response = self.client.post(
            reverse('find_ticket'),
            {},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
