"""End-to-end tests for per-attendee checkout.

Exercises the real request path: serializer -> checkout view -> order ->
fulfillment -> QR issuance -> per-recipient email delivery.

These are TestCase tests and need a MySQL database, like the rest of the
suite. They were verified locally end-to-end before shipping.
"""
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from unittest.mock import patch

from core.models import (
    Event, OrganizerProfile, TicketType, Order, OrderItem, Ticket, User,
)


class AttendeeCheckoutFlowTests(TestCase):
    def setUp(self):
        mail.outbox = []
        org_user = User.objects.create_user(
            username='floworg', email='floworg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Flow Org'},
        )
        self.free_event = Event.objects.create(
            organizer=self.organizer, title='Free Flow Event', capacity=100,
            slug='free-flow-event',
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.free_tier = TicketType.objects.create(
            event=self.free_event, tier='REGULAR', name='Regular',
            price=0, quantity=50,
        )
        self.paid_event = Event.objects.create(
            organizer=self.organizer, title='Paid Flow Event', capacity=100,
            slug='paid-flow-event',
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.paid_tier = TicketType.objects.create(
            event=self.paid_event, tier='REGULAR', name='Regular',
            price=100000, quantity=50,
        )

    def _payload(self, event, tier, quantity, attendees=None):
        data = {
            'event_id': event.id,
            'items': [{'ticket_type_id': tier.id, 'quantity': quantity}],
            'guest_name': 'Buyer Person',
            'guest_email': 'buyer@example.com',
            'guest_phone': '08012345678',
        }
        if attendees is not None:
            data['attendees'] = attendees
        return data

    def test_toggle_off_sends_all_tickets_to_payment_email(self):
        payload = self._payload(self.free_event, self.free_tier, 2)
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 201, res.data)

        order = Order.objects.get(pk=res.data['order']['id'])
        tickets = list(order.tickets.all())
        self.assertEqual(len(tickets), 2)
        self.assertEqual({t.attendee_email for t in tickets}, {'buyer@example.com'})
        self.assertEqual({t.attendee_name for t in tickets}, {'Buyer Person'})
        self.assertTrue(all(t.qr_token for t in tickets))
        self.assertEqual(order.total_amount, 0)

        self.assertEqual(len(mail.outbox), 2)  # buyer receipt + organizer sale alert
        by_to = {m.to[0]: m for m in mail.outbox}
        self.assertEqual(set(by_to), {'buyer@example.com', 'floworg@example.com'})
        self.assertEqual(mail.outbox[0].to, ['buyer@example.com'])
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn(tickets[0].qr_token.replace('=', ''), html.replace('=', ''))
        self.assertIn(tickets[1].qr_token.replace('=', ''), html.replace('=', ''))

    def test_toggle_on_sends_each_attendee_only_their_ticket(self):
        attendees = [
            {'ticket_type_id': self.free_tier.id, 'first_name': 'Ada',
             'last_name': 'Obi', 'email': 'ada@example.com'},
            {'ticket_type_id': self.free_tier.id, 'first_name': 'Bola',
             'last_name': '', 'email': 'BOLA@example.com'},
        ]
        payload = self._payload(self.free_event, self.free_tier, 2, attendees)
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 201, res.data)

        order = Order.objects.get(pk=res.data['order']['id'])
        tickets = list(order.tickets.order_by('id'))
        self.assertEqual(len(tickets), 2)
        self.assertEqual(
            [(t.attendee_name, t.attendee_email) for t in tickets],
            [('Ada Obi', 'ada@example.com'), ('Bola', 'bola@example.com')],
        )
        self.assertNotEqual(tickets[0].qr_token, tickets[1].qr_token)

        by_to = {m.to[0]: m for m in mail.outbox}
        self.assertEqual(
            set(by_to),
            {'ada@example.com', 'bola@example.com', 'floworg@example.com'},
        )

        ada_html = by_to['ada@example.com'].alternatives[0][0]
        bola_html = by_to['bola@example.com'].alternatives[0][0]
        self.assertIn(tickets[0].qr_token.replace('=', ''), ada_html.replace('=', ''))
        self.assertNotIn(tickets[1].qr_token.replace('=', ''), ada_html.replace('=', ''))
        self.assertIn(tickets[1].qr_token.replace('=', ''), bola_html.replace('=', ''))
        self.assertNotIn(tickets[0].qr_token.replace('=', ''), bola_html.replace('=', ''))

    def test_attendee_count_must_match_tickets(self):
        payload = self._payload(self.free_event, self.free_tier, 2, [
            {'ticket_type_id': self.free_tier.id, 'first_name': 'Ada',
             'email': 'ada@example.com'},
        ])
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(Order.objects.count(), 0)

    def test_invalid_attendee_email_is_rejected(self):
        payload = self._payload(self.free_event, self.free_tier, 1, [
            {'ticket_type_id': self.free_tier.id, 'first_name': 'Ada',
             'email': 'nope'},
        ])
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(Order.objects.count(), 0)

    @patch('api.views_checkout.initialize_transaction')
    def test_paid_order_keeps_attendees_until_payment_then_issues_them(self, init):
        init.return_value = {
            'data': {
                'access_code': 'ac_test',
                'authorization_url': 'https://checkout.paystack.com/test',
            }
        }
        attendees = [
            {'ticket_type_id': self.paid_tier.id, 'first_name': 'Ada',
             'last_name': 'Obi', 'email': 'ada@example.com'},
            {'ticket_type_id': self.paid_tier.id, 'first_name': 'Bola',
             'last_name': 'Ade', 'email': 'bola@example.com'},
        ]
        payload = self._payload(self.paid_event, self.paid_tier, 2, attendees)
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['payment_required'])

        order = Order.objects.get(pk=res.data['order']['id'])
        self.assertEqual(order.status, 'PENDING')
        self.assertEqual(order.total_amount, 210000)  # 2000 + 5% fee, unchanged
        self.assertEqual(order.fee_amount, 10000)
        self.assertEqual(order.attendees[0]['email'], 'ada@example.com')
        self.assertEqual(order.tickets.count(), 0)

        # Simulate Paystack confirmation -> fulfillment path used by webhook/verify.
        from core.utils.fulfillment import fulfill_order
        payment = order.payment
        payment.status = 'SUCCESS'
        payment.save(update_fields=['status'])
        fulfill_order(order, payment=payment)

        order.refresh_from_db()
        tickets = list(order.tickets.order_by('id'))
        self.assertEqual(order.status, 'COMPLETED')
        self.assertEqual(
            [(t.attendee_name, t.attendee_email) for t in tickets],
            [('Ada Obi', 'ada@example.com'), ('Bola Ade', 'bola@example.com')],
        )
        self.assertEqual(
            set(m.to[0] for m in mail.outbox),
            {'ada@example.com', 'bola@example.com', 'floworg@example.com'},
        )

    def test_attendee_can_open_their_own_pass(self):
        attendees = [
            {'ticket_type_id': self.free_tier.id, 'first_name': 'Ada',
             'last_name': 'Obi', 'email': 'ada@example.com'},
        ]
        payload = self._payload(self.free_event, self.free_tier, 1, attendees)
        res = self.client.post(
            reverse('orders_checkout'), payload, content_type='application/json'
        )
        self.assertEqual(res.status_code, 201, res.data)
        ticket = Ticket.objects.get(order_id=res.data['order']['id'])

        ada = User.objects.create_user(
            username='ada', email='ada@example.com', password='password', role='ATTENDEE',
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        ada_headers = {
            'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(ada).access_token}'
        }
        ok = self.client.get(
            reverse('public_ticket', args=[ticket.qr_token]), **ada_headers
        )
        self.assertEqual(ok.status_code, 200, getattr(ok, 'data', None))

        stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com',
            password='password', role='ATTENDEE',
        )
        stranger_headers = {
            'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(stranger).access_token}'
        }
        denied = self.client.get(
            reverse('public_ticket', args=[ticket.qr_token]), **stranger_headers
        )
        self.assertEqual(denied.status_code, 403)

        # Find My Ticket recognises the attendee email too.
        found = self.client.post(
            reverse('find_ticket'),
            {'email': 'ada@example.com'},
            content_type='application/json',
        )
        self.assertEqual(found.status_code, 200, getattr(found, 'data', None))
