"""
Tests for per-attendee checkout and ticket delivery.

These are SimpleTestCase based on purpose: they exercise input validation and
email routing without needing a database, so they run in CI and locally.
"""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from api.serializers import CheckoutRequestSerializer
from core.utils.notifications import group_tickets_by_recipient, send_purchase_receipt


def make_event():
    return SimpleNamespace(
        title='Test Event',
        cover_image=None,
        is_online=False,
        venue=None,
        city=None,
        country=None,
        location_name=None,
        start_time=None,
        end_time=None,
    )


def make_order(buyer_email='buyer@example.com', buyer_name='Buyer Name'):
    return SimpleNamespace(
        id=1,
        guest_email=buyer_email,
        guest_name=buyer_name,
        attendee=None,
        event=make_event(),
        total_amount=0,
    )


def make_ticket(token, email='', name=''):
    return SimpleNamespace(
        qr_token=token,
        attendee_email=email,
        attendee_name=name,
        ticket_type=SimpleNamespace(name='Regular'),
    )


class CheckoutAttendeeSerializerTests(SimpleTestCase):
    def payload(self, **overrides):
        data = {
            'event_id': 1,
            'items': [{'ticket_type_id': 10, 'quantity': 2}],
            'attendees': [
                {
                    'ticket_type_id': 10,
                    'first_name': 'Ada',
                    'last_name': 'Obi',
                    'email': 'ada@example.com',
                },
                {
                    'ticket_type_id': 10,
                    'first_name': 'Bola',
                    'email': 'bola@example.com',
                },
            ],
        }
        data.update(overrides)
        return data

    def test_accepts_one_attendee_per_ticket(self):
        serializer = CheckoutRequestSerializer(data=self.payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        attendees = serializer.validated_data['attendees']
        self.assertEqual(len(attendees), 2)
        self.assertEqual(attendees[0]['email'], 'ada@example.com')
        self.assertEqual(attendees[1]['last_name'], '')

    def test_attendees_are_optional(self):
        data = self.payload()
        data.pop('attendees')
        serializer = CheckoutRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['attendees'], [])

    def test_rejects_invalid_email(self):
        data = self.payload()
        data['attendees'][1]['email'] = 'not-an-email'
        serializer = CheckoutRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('attendees', serializer.errors)

    def test_rejects_blank_first_name(self):
        data = self.payload()
        data['attendees'][0]['first_name'] = '   '
        serializer = CheckoutRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('attendees', serializer.errors)


class TicketEmailRoutingTests(SimpleTestCase):
    def test_groups_tickets_by_attendee_email(self):
        tickets = [
            make_ticket('T1', 'ada@example.com'),
            make_ticket('T2', 'bola@example.com'),
            make_ticket('T3', 'ada@example.com'),
            make_ticket('T4', ''),
        ]
        groups = group_tickets_by_recipient(tickets, 'buyer@example.com')
        self.assertEqual(
            {email: [t.qr_token for t in group] for email, group in groups.items()},
            {
                'ada@example.com': ['T1', 'T3'],
                'bola@example.com': ['T2'],
                'buyer@example.com': ['T4'],
            },
        )

    def _send(self, order, tickets):
        sent = []

        def fake_send(subject, message, from_email, recipients, html_message=None, **kwargs):
            sent.append({'to': recipients[0], 'html': html_message or message})

        with patch('core.utils.notifications.send_mail', side_effect=fake_send), \
             patch('core.utils.notifications.EmailLog.objects.create'):
            send_purchase_receipt(order, tickets)
        return sent

    def test_each_attendee_receives_only_their_own_ticket(self):
        order = make_order()
        tickets = [
            make_ticket('TOKEN-ADA', 'ada@example.com', 'Ada Obi'),
            make_ticket('TOKEN-BOLA', 'bola@example.com', 'Bola Ade'),
        ]

        sent = self._send(order, tickets)

        by_recipient = {item['to']: item['html'] for item in sent}
        self.assertEqual(set(by_recipient), {'ada@example.com', 'bola@example.com'})

        # Second person's QR must never leak into the first person's email.
        self.assertIn('TOKEN-ADA', by_recipient['ada@example.com'])
        self.assertNotIn('TOKEN-BOLA', by_recipient['ada@example.com'])
        self.assertIn('TOKEN-BOLA', by_recipient['bola@example.com'])
        self.assertNotIn('TOKEN-ADA', by_recipient['bola@example.com'])

    def test_buyer_does_not_get_a_copy_when_tickets_go_to_others(self):
        order = make_order()
        tickets = [make_ticket('TOKEN-ADA', 'ada@example.com', 'Ada Obi')]

        sent = self._send(order, tickets)

        self.assertEqual([item['to'] for item in sent], ['ada@example.com'])

    def test_toggle_off_sends_every_ticket_to_the_buyer(self):
        order = make_order()
        tickets = [make_ticket('TOKEN-1'), make_ticket('TOKEN-2')]

        sent = self._send(order, tickets)

        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0]['to'], 'buyer@example.com')
        self.assertIn('TOKEN-1', sent[0]['html'])
        self.assertIn('TOKEN-2', sent[0]['html'])

    def test_shared_email_receives_a_single_email_with_both_tickets(self):
        order = make_order()
        tickets = [
            make_ticket('TOKEN-A', 'same@example.com', 'Ada Obi'),
            make_ticket('TOKEN-B', 'same@example.com', 'Ada Obi'),
        ]

        sent = self._send(order, tickets)

        # One email to the shared address containing both tickets; the buyer
        # does not receive a copy.
        self.assertEqual([item['to'] for item in sent], ['same@example.com'])
        self.assertIn('TOKEN-A', sent[0]['html'])
        self.assertIn('TOKEN-B', sent[0]['html'])
