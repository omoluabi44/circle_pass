"""
Announcements can target a single ticket tier (VIP only, Early Bird only, ...)
instead of blasting every attendee.

Recipients come from issued passes, so a ticket bought for someone else is
addressed to that attendee and tier filtering is exact.
"""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.tasks import resolve_announcement_recipients
from core.models import (
    Event, EventAnnouncement, Order, OrderItem, OrganizerProfile, Ticket,
    TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


class AnnouncementTierTargetingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        organiser = User.objects.create_user(
            username='announceorg', email='announceorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=organiser, defaults={'company_name': 'Announce Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Tier Test Event',
            slug='tier-test-event', capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.vip = TicketType.objects.create(
            event=self.event, tier='VIP', name='VIP', price=500000, quantity=20,
        )
        self.early = TicketType.objects.create(
            event=self.event, tier='EARLY_BIRD', name='Earlybird', price=100000, quantity=20,
        )
        self.regular = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=200000, quantity=20,
        )

        self._make_ticket(self.vip, 'Vera Vip', 'vera@example.com')
        self._make_ticket(self.early, 'Emeka Early', 'emeka@example.com')
        self._make_ticket(self.regular, 'Rita Regular', 'rita@example.com')
        # A buyer who bought a Regular pass for a friend: the friend holds it.
        self._make_ticket(self.regular, 'Femi Friend', 'femi@example.com')

        self.client.force_authenticate(user=organiser)

    def _make_ticket(self, ticket_type, name, email):
        order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=ticket_type.price,
            total_amount=ticket_type.price, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=order, ticket_type=ticket_type, quantity=1,
            unit_price=ticket_type.price, line_total=ticket_type.price,
        )
        return Ticket.objects.create(
            order=order, ticket_type=ticket_type,
            attendee_name=name, attendee_email=email,
            status='ACTIVE', qr_token=generate_secure_qr_token(),
        )

    def test_without_filter_every_attendee_is_included(self):
        recipients = resolve_announcement_recipients(self.event)

        self.assertEqual(
            set(recipients),
            {'vera@example.com', 'emeka@example.com',
             'rita@example.com', 'femi@example.com'},
        )

    def test_vip_filter_only_returns_vip_holders(self):
        recipients = resolve_announcement_recipients(
            self.event, ticket_type_ids=[self.vip.id],
        )

        self.assertEqual(list(recipients), ['vera@example.com'])
        self.assertEqual(recipients['vera@example.com'], 'Vera')

    def test_multiple_tiers_can_be_selected(self):
        recipients = resolve_announcement_recipients(
            self.event, ticket_type_ids=[self.vip.id, self.early.id],
        )

        self.assertEqual(set(recipients), {'vera@example.com', 'emeka@example.com'})

    @patch('api.tasks.send_event_announcement_email')
    def test_api_stores_tier_and_counts_only_that_tier(self, mocked_send):
        response = self.client.post(
            reverse('event_announcements', args=[self.event.id]),
            {
                'title': 'VIP arrival info',
                'message': 'Use the VIP entrance.',
                'audience': 'attendees_only',
                'ticket_type_ids': [self.vip.id],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        self.assertEqual(response.data['recipients_count'], 1)
        self.assertEqual(response.data['ticket_type_ids'], [self.vip.id])

        announcement = EventAnnouncement.objects.get(pk=response.data['id'])
        self.assertEqual(announcement.ticket_type_ids, [self.vip.id])

    def test_tier_from_another_event_is_rejected(self):
        other_event = Event.objects.create(
            organizer=self.organizer, title='Another Event',
            slug='another-event', capacity=10,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        other_tier = TicketType.objects.create(
            event=other_event, tier='VIP', name='Other VIP', price=0, quantity=5,
        )

        response = self.client.post(
            reverse('event_announcements', args=[self.event.id]),
            {
                'title': 'Nope',
                'message': 'Nope',
                'audience': 'attendees_only',
                'ticket_type_ids': [other_tier.id],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('do not belong', response.data['error'])

    def test_tier_with_no_holders_reports_clearly(self):
        # A tier that exists but has no issued passes yet.
        solo_event = Event.objects.create(
            organizer=self.organizer, title='Sold Nothing Yet',
            slug='sold-nothing-yet', capacity=10,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        empty_tier = TicketType.objects.create(
            event=solo_event, tier='VIP', name='Golden Circle', price=100000, quantity=10,
        )

        response = self.client.post(
            reverse('event_announcements', args=[solo_event.id]),
            {
                'title': 'Hello',
                'message': 'Anybody?',
                'audience': 'attendees_only',
                'ticket_type_ids': [empty_tier.id],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Golden Circle', response.data['error'])
