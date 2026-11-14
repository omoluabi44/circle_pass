"""
Admin Tickets & Orders: search/status/event filters and the Amount Paid column.

Regression: the search filter used `order__order_number`, which is a display
string rather than a database column, so every search raised FieldError and the
table silently stayed as it was.
"""
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Event, Order, OrderItem, OrganizerProfile, Payment, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


class AdminTicketListFilterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        org_user = User.objects.create_user(
            username='filterorg', email='filterorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Filter Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Filter Test Event', slug='filter-test-event', capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.other_event = Event.objects.create(
            organizer=self.organizer, title='Second Test Event', slug='second-test-event', capacity=50,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=500000, quantity=20,
        )
        self.other_type = TicketType.objects.create(
            event=self.other_event, tier='REGULAR', name='Standard',
            price=100000, quantity=20,
        )

        # Two-ticket paid order: â‚¦5,000 + â‚¦5,000 tickets, â‚¦250 fee each? use fee 25000 (â‚¦250)
        self.order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=1000000,
            fee_amount=50000, total_amount=1050000, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            quantity=2, unit_price=500000, line_total=1000000,
        )
        Payment.objects.create(
            order=self.order, reference='PAY-FILTER-001',
            amount=1050000, status='SUCCESS', provider='PAYSTACK',
        )
        self.ticket_one = Ticket.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            attendee_name='Adiela Jennifer Fidelis',
            attendee_email='adiela@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )
        self.ticket_two = Ticket.objects.create(
            order=self.order, ticket_type=self.ticket_type,
            attendee_name='Michael Shedara', attendee_email='michael@example.com',
            status='USED', qr_token=generate_secure_qr_token(),
        )

        # Ticket on a different event, to prove the event filter works
        other_order = Order.objects.create(
            event=self.other_event, guest_email='other@example.com',
            subtotal=100000, total_amount=100000, status='COMPLETED',
        )
        Ticket.objects.create(
            order=other_order, ticket_type=self.other_type,
            attendee_name='Other Person', attendee_email='other@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )

        self.admin = User.objects.create_user(
            username='filteradmin', email='filteradmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def _list(self, **params):
        return self.client.get(reverse('admin_ticket_list'), params)

    def test_search_by_attendee_name(self):
        response = self._list(q='Michael')

        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['tickets'][0]['attendee_name'], 'Michael Shedara')

    def test_search_by_payment_reference(self):
        response = self._list(q='PAY-FILTER-001')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 2)

    def test_search_by_event_title(self):
        response = self._list(q='Second Test Event')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)

    def test_status_filter(self):
        response = self._list(status='USED')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['tickets'][0]['attendee_name'], 'Michael Shedara')

    def test_event_filter(self):
        response = self._list(event_id=str(self.other_event.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['tickets'][0]['event_title'], 'Second Test Event')

    def test_amount_paid_per_ticket_includes_fees(self):
        response = self._list(q='Adiela')
        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))

        ticket = response.data['tickets'][0]
        # â‚¦10,500 charged for 2 passes -> â‚¦5,250 each
        self.assertEqual(ticket['amount_paid'], 525000)
        self.assertEqual(ticket['amount_paid_naira'], 5250)
        self.assertEqual(ticket['order_total_naira'], 10500)
        self.assertEqual(ticket['order_ticket_count'], 2)
