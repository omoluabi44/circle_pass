"""Event notification email: compulsory per event, and the sale inbox for it."""
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from api.serializers import EventCreateUpdateSerializer
from core.models import (
    EmailLog, Event, Order, OrderItem, OrganizerProfile, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


class EventNotificationEmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='notifyorg', email='signin@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Notify Org'},
        )
        self.organizer.contact_email = 'profile@example.com'
        self.organizer.save(update_fields=['contact_email'])

    def _payload(self, title, **overrides):
        data = {
            'title': title,
            'description': 'Test',
            'capacity': 100,
            'event_type': 'PHYSICAL',
            'organizer_contact': '08000000000',
            'start_time': timezone.now().isoformat(),
            'end_time': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
        }
        data.update(overrides)
        return data

    # ── Compulsory on create ──────────────────────────────────────────────────
    def test_event_cannot_be_created_without_a_notification_email(self):
        serializer = EventCreateUpdateSerializer(data=self._payload('No Inbox Event'))

        self.assertFalse(serializer.is_valid())
        self.assertIn('notification_email', serializer.errors)
        self.assertIn(
            'required', serializer.errors['notification_email'][0].lower(),
        )

    def test_event_saves_its_own_notification_email(self):
        serializer = EventCreateUpdateSerializer(data=self._payload(
            'Inbox Event', notification_email='festival@example.com',
        ))
        serializer.is_valid(raise_exception=True)
        event = serializer.save(organizer=self.organizer)

        self.assertEqual(event.notification_email, 'festival@example.com')

    def test_two_events_can_use_different_addresses(self):
        first = EventCreateUpdateSerializer(data=self._payload(
            'Event One', notification_email='one@example.com',
        ))
        first.is_valid(raise_exception=True)
        one = first.save(organizer=self.organizer)

        second = EventCreateUpdateSerializer(data=self._payload(
            'Event Two', notification_email='two@example.com',
        ))
        second.is_valid(raise_exception=True)
        two = second.save(organizer=self.organizer)

        self.assertNotEqual(one.notification_email, two.notification_email)

    def test_existing_event_can_still_be_edited_without_the_field(self):
        event = Event.objects.create(
            organizer=self.organizer, title='Legacy', slug='legacy-event',
            capacity=10, notification_email='legacy@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='DRAFT',
        )

        serializer = EventCreateUpdateSerializer(
            event, data={'title': 'Legacy Renamed'}, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        event.refresh_from_db()
        self.assertEqual(event.notification_email, 'legacy@example.com')

    def test_clearing_the_field_is_rejected(self):
        event = Event.objects.create(
            organizer=self.organizer, title='Clearable', slug='clearable-event',
            capacity=10, notification_email='keep@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='DRAFT',
        )

        serializer = EventCreateUpdateSerializer(
            event, data={'notification_email': ''}, partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('notification_email', serializer.errors)

    # ── Sale notifications use the event inbox ───────────────────────────────
    def _make_sale(self, event):
        ticket_type = TicketType.objects.create(
            event=event, tier='REGULAR', name='Regular', price=500000, quantity=10,
        )
        order = Order.objects.create(
            event=event, guest_email='buyer@example.com', guest_name='Buyer',
            subtotal=500000, total_amount=500000, status='COMPLETED',
        )
        OrderItem.objects.create(
            order=order, ticket_type=ticket_type,
            quantity=1, unit_price=500000, line_total=500000,
        )
        ticket = Ticket.objects.create(
            order=order, ticket_type=ticket_type,
            attendee_name='Buyer', attendee_email='buyer@example.com',
            status='ISSUED', qr_token=generate_secure_qr_token(),
        )
        return order, [ticket]

    def test_sale_notification_goes_to_the_event_inbox(self):
        event = Event.objects.create(
            organizer=self.organizer, title='Sale Event', slug='sale-event',
            capacity=100, notification_email='sales-inbox@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        order, tickets = self._make_sale(event)

        from core.utils.notifications import send_organizer_sales_notification

        with patch('core.utils.notifications.send_mail') as send_mail:
            send_organizer_sales_notification(order, tickets)

        send_mail.assert_called_once()
        self.assertEqual(send_mail.call_args[0][3], ['sales-inbox@example.com'])

    def test_sale_notification_falls_back_to_the_profile_email(self):
        event = Event.objects.create(
            organizer=self.organizer, title='Legacy Sale', slug='legacy-sale',
            capacity=100, notification_email='',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        order, tickets = self._make_sale(event)

        from core.utils.notifications import send_organizer_sales_notification

        with patch('core.utils.notifications.send_mail') as send_mail:
            send_organizer_sales_notification(order, tickets)

        send_mail.assert_called_once()
        self.assertEqual(send_mail.call_args[0][3], ['profile@example.com'])
        self.assertEqual(EmailLog.objects.filter(status='Sent').count(), 1)
