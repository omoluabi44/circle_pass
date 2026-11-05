"""Tests for the cross-event organizer Audience/Contacts API."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    AttendeeProfile, Event, Order, OrderItem, OrganizerProfile, Ticket,
    TicketType, User,
)


class OrganizerContactsAggregationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='contactsorg', email='contactsorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Contacts Org'},
        )
        self.other_user = User.objects.create_user(
            username='otherorg', email='otherorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.other_organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.other_user, defaults={'company_name': 'Other Org'},
        )

        self.events = []
        for index in range(3):
            event = Event.objects.create(
                organizer=self.organizer,
                title=f'Hosted Event {index + 1}',
                slug=f'hosted-event-{index + 1}',
                capacity=100,
                start_time=timezone.now() + timezone.timedelta(days=7 + index),
                end_time=timezone.now() + timezone.timedelta(days=8 + index),
                status='PUBLISHED',
            )
            event.tier = TicketType.objects.create(
                event=event, tier='REGULAR', name='Regular',
                price=0, quantity=50,
            )
            self.events.append(event)

        # Sales on events 1 and 2 only; event 3 has no tickets.
        self.ticket_used = self._sell(self.events[0], 'Ada Obi', 'ada@example.com', '08011111111', used=True)
        self.ticket_open = self._sell(self.events[1], 'Bola Ade', 'bola@example.com', '08022222222')
        self.ticket_open_2 = self._sell(self.events[1], 'Bola Ade', 'bola@example.com', '08022222222')

        # Another organizer's sale must never leak in.
        other_event = Event.objects.create(
            organizer=self.other_organizer, title='Someone Else', slug='someone-else',
            capacity=100, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )
        other_tier = TicketType.objects.create(
            event=other_event, tier='REGULAR', name='Regular', price=0, quantity=10,
        )
        self._sell(other_event, 'Stranger', 'stranger@example.com', '08099999999', tier=other_tier)

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _sell(self, event, name, email, phone, used=False, tier=None):
        order = Order.objects.create(
            event=event, guest_email=email, guest_name=name, guest_phone=phone,
            subtotal=0, total_amount=0, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=order, ticket_type=tier or event.tier,
            quantity=1, unit_price=0, line_total=0,
        )
        from core.utils.qr import generate_secure_qr_token
        ticket = Ticket.objects.create(
            order=order, ticket_type=tier or event.tier,
            attendee_name=name, attendee_email=email,
            status='USED' if used else 'ISSUED',
            qr_token=generate_secure_qr_token(),
        )
        if used:
            from core.models import CheckIn
            CheckIn.objects.create(ticket=ticket, status='Valid')
        return ticket

    def test_lists_tickets_across_every_event(self):
        res = self.client.get('/api/organizer/contacts/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(len(res.data), 3)
        self.assertEqual(
            {row['event_title'] for row in res.data},
            {'Hosted Event 1', 'Hosted Event 2'},
        )
        # Each row carries the event link target and order info.
        for row in res.data:
            self.assertIn(row['event_id'], [self.events[0].id, self.events[1].id])
            self.assertTrue(row['event_slug'].startswith('hosted-event-'))
            self.assertTrue(row['order_reference'] is not None)

    def test_events_picker_lists_all_events_even_without_sales(self):
        res = self.client.get('/api/organizer/contacts/events/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(len(res.data), 3)
        counts = {row['title']: row['tickets_sold'] for row in res.data}
        self.assertEqual(
            counts,
            {'Hosted Event 1': 1, 'Hosted Event 2': 2, 'Hosted Event 3': 0},
        )
        checked_in = {row['title']: row['checked_in'] for row in res.data}
        self.assertEqual(checked_in['Hosted Event 1'], 1)
        self.assertEqual(checked_in['Hosted Event 2'], 0)

    def test_filter_by_event(self):
        res = self.client.get(f'/api/organizer/contacts/?event_id={self.events[1].id}')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(len(res.data), 2)
        self.assertTrue(all(row['event_id'] == self.events[1].id for row in res.data))

    def test_filter_by_check_in_status(self):
        used = self.client.get('/api/organizer/contacts/?status=USED')
        self.assertEqual(used.status_code, 200, used.data)
        self.assertEqual([row['id'] for row in used.data], [self.ticket_used.id])
        self.assertIsNotNone(used.data[0]['checked_in_at'])

        not_used = self.client.get('/api/organizer/contacts/?status=NOT_USED')
        self.assertEqual(not_used.status_code, 200, not_used.data)
        self.assertEqual(
            {row['id'] for row in not_used.data},
            {self.ticket_open.id, self.ticket_open_2.id},
        )

    def test_search_matches_event_title_and_order_id(self):
        by_event = self.client.get('/api/organizer/contacts/?search=Hosted%20Event%202')
        self.assertEqual(by_event.status_code, 200, by_event.data)
        self.assertEqual(len(by_event.data), 2)

        by_order = self.client.get(f'/api/organizer/contacts/?search={self.ticket_used.order_id}')
        self.assertEqual(by_order.status_code, 200, by_order.data)
        self.assertIn(self.ticket_used.id, [row['id'] for row in by_order.data])
