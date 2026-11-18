"""One-hour "you left your ticket purchase unfinished" reminder.

Anyone who starts a paid checkout but never pays gets exactly one reminder an
hour later, even though the order itself has already expired by then.
"""
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.tasks import send_abandoned_checkout_reminder
from core.models import (
    EmailOptOut, Event, Order, OrderItem, OrganizerProfile, Payment, Ticket,
    TicketType, User,
)
from core.utils.email_prefs import unsubscribe_token


class CheckoutReminderTests(TestCase):
    def setUp(self):
        mail.outbox = []
        org_user = User.objects.create_user(
            username='remindorg', email='remindorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Remind Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Neon Night', slug='neon-night',
            capacity=100, notification_email='neon@example.com',
            start_time=timezone.now() + timedelta(days=5),
            end_time=timezone.now() + timedelta(days=6),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=500000, quantity=50,
        )

    def _order(self, status='CANCELLED', total=500000, email='buyer@example.com'):
        order = Order.objects.create(
            event=self.event, guest_email=email, guest_name='Ada Lovelace',
            subtotal=total, total_amount=total, status=status,
        )
        OrderItem.objects.create(
            order=order, ticket_type=self.ticket_type,
            quantity=1, unit_price=total, line_total=total,
        )
        return order

    # ── The reminder is sent ─────────────────────────────────────────────────
    def test_expired_order_still_gets_the_reminder(self):
        order = self._order(status='CANCELLED')

        result = send_abandoned_checkout_reminder(order.id)

        self.assertIn('Sent', result)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['buyer@example.com'])
        self.assertEqual(
            message.subject, "Your Neon Night ticket purchase isn't complete",
        )
        self.assertIn('Ada', message.body)
        self.assertIn('Regular', message.body)
        self.assertIn('Neon Night', message.body)

        html = message.alternatives[0][0]
        self.assertIn('unfinished.', html)
        self.assertIn('GET YOUR TICKET', html)
        self.assertIn('/unsubscribe?token=', html)

    def test_the_order_is_marked_as_reminded(self):
        order = self._order()

        send_abandoned_checkout_reminder(order.id)

        order.refresh_from_db()
        self.assertIsNotNone(order.checkout_reminder_sent_at)

    def test_only_one_reminder_per_checkout(self):
        order = self._order()

        send_abandoned_checkout_reminder(order.id)
        second = send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('already sent', second)

    def test_attendee_orders_use_the_account_email(self):
        from core.models import AttendeeProfile

        buyer = User.objects.create_user(
            username='buyeracc', email='account@example.com',
            password='password', role='ATTENDEE',
        )
        profile, _ = AttendeeProfile.objects.get_or_create(user=buyer)
        order = self._order(email='')
        order.guest_email = ''
        order.attendee = profile
        order.save(update_fields=['guest_email', 'attendee'])

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['account@example.com'])

    # ── Nothing is sent when they already have what they wanted ──────────────
    def test_completed_order_is_skipped(self):
        order = self._order(status='COMPLETED')

        result = send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)
        self.assertIn('completed', result)

    def test_free_order_is_skipped(self):
        order = self._order(total=0)

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)

    def test_order_with_issued_tickets_is_skipped(self):
        order = self._order()
        Ticket.objects.create(
            order=order, ticket_type=self.ticket_type,
            attendee_name='Ada', attendee_email='buyer@example.com',
            status='ISSUED', qr_token='qr-token-for-reminder-test-1234567890',
        )

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)

    def test_successful_payment_is_skipped(self):
        order = self._order()
        Payment.objects.create(
            order=order, reference='ref-paid-123', amount=500000,
            status='SUCCESS', provider='PAYSTACK',
        )

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)

    def test_opted_out_address_is_skipped(self):
        EmailOptOut.objects.create(email='buyer@example.com')
        order = self._order()

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)

    # ── Unsubscribe link ─────────────────────────────────────────────────────
    def test_unsubscribe_link_identifies_the_address(self):
        client = APIClient()
        token = unsubscribe_token('buyer@example.com')

        check = client.get(reverse('email_unsubscribe'), {'token': token})
        self.assertEqual(check.status_code, 200, check.data)
        self.assertEqual(check.data['email'], 'bu***@example.com')
        self.assertFalse(check.data['unsubscribed'])

        done = client.post(
            reverse('email_unsubscribe'), {'token': token}, format='json',
        )
        self.assertEqual(done.status_code, 200, done.data)
        self.assertTrue(done.data['unsubscribed'])
        self.assertTrue(
            EmailOptOut.objects.filter(email='buyer@example.com').exists()
        )

    def test_invalid_token_is_rejected(self):
        client = APIClient()

        response = client.post(
            reverse('email_unsubscribe'), {'token': 'not-a-real-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)

    def test_unsubscribe_removes_the_address_from_future_reminders(self):
        client = APIClient()
        client.post(
            reverse('email_unsubscribe'),
            {'token': unsubscribe_token('buyer@example.com')},
            format='json',
        )
        order = self._order()

        send_abandoned_checkout_reminder(order.id)

        self.assertEqual(len(mail.outbox), 0)

    # ── Scheduling ──────────────────────────────────────────────────────────
    def test_sweep_catches_orders_whose_task_was_lost(self):
        from api.tasks import send_checkout_reminder_sweep

        order = self._order()
        Order.objects.filter(pk=order.pk).update(
            created_at=timezone.now() - timedelta(hours=2),
        )

        result = send_checkout_reminder_sweep()
        again = send_checkout_reminder_sweep()

        self.assertIn('sent 1', result)
        self.assertIn('sent 0', again)
        self.assertEqual(len(mail.outbox), 1)

    def test_sweep_leaves_recent_checkouts_for_the_one_hour_task(self):
        from api.tasks import send_checkout_reminder_sweep

        order = self._order()  # created just now

        send_checkout_reminder_sweep()

        self.assertEqual(len(mail.outbox), 0)
        order.refresh_from_db()
        self.assertIsNone(order.checkout_reminder_sent_at)

    def test_checkout_queues_a_single_one_hour_reminder(self):
        from api import views_checkout

        buyer = User.objects.create_user(
            username='queuedbuyer', email='queued@example.com',
            password='password', role='ATTENDEE',
        )
        with patch.object(
            views_checkout, 'initialize_transaction',
            return_value={
                'data': {
                    'access_code': 'ac', 'authorization_url': 'https://pay.test',
                },
            },
        ), patch.object(
            views_checkout, 'get_active_gateway', return_value='PAYSTACK',
        ), patch(
            'api.tasks.send_abandoned_checkout_reminder.apply_async'
        ) as queued, patch(
            'api.tasks.expire_pending_order.apply_async'
        ):
            from rest_framework.test import APIClient as Client
            api = Client()
            api.force_authenticate(user=buyer)
            response = api.post('/api/orders/checkout/', {
                'event_id': self.event.id,
                'items': [{'ticket_type_id': self.ticket_type.id, 'quantity': 1}],
                'guest_email': 'queued@example.com',
                'guest_name': 'Queued Buyer',
            }, format='json')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        queued.assert_called_once()
        countdown = queued.call_args.kwargs.get('countdown')
        self.assertEqual(countdown, 3600)
