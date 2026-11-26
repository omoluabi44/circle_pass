"""Admins can run PassControl for any event, from any organizer.

Nothing below admin changes: organizers and team members still need their own
event (or an active team membership) and still have to say which event they are
scanning for.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Event, Order, OrganizerProfile, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


class AdminAnyEventCheckInTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='gateadmin', email='gateadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        self.organizer_user = User.objects.create_user(
            username='gateorg', email='gateorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.organizer_user, defaults={'company_name': 'Gate Org'},
        )
        self.other_organizer = OrganizerProfile.objects.create(
            user=User.objects.create_user(
                username='otherorg', email='otherorg@example.com',
                password='password', role='ATTENDEE',
            ),
            company_name='Other Org',
        )

        self.event = self._event(self.organizer, 'Admin Gate Event')
        self.other_event = self._event(self.other_organizer, 'Somebody Else Event')
        self.ticket = self._ticket(self.event, 'Ada Lovelace')
        self.other_ticket = self._ticket(self.other_event, 'Grace Hopper')

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)
        self.organizer_client = APIClient()
        self.organizer_client.force_authenticate(user=self.organizer_user)

        self.scan_url = reverse('checkin_scan')
        self.search_url = reverse('checkin_search')

    def _event(self, organizer, title):
        return Event.objects.create(
            organizer=organizer, title=title,
            slug=title.lower().replace(' ', '-'),
            capacity=100, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )

    def _ticket(self, event, name):
        ticket_type = TicketType.objects.create(
            event=event, name='Regular', price=500000, quantity=10,
        )
        order = Order.objects.create(
            event=event, guest_name=name, guest_email=f'{name.split()[0].lower()}@example.com',
            subtotal=500000, total_amount=500000, status='COMPLETED',
        )
        return Ticket.objects.create(
            order=order, ticket_type=ticket_type, attendee_name=name,
            attendee_email=order.guest_email, status='ACTIVE',
            qr_token=generate_secure_qr_token(),
        )

    # ── Admin scans any ticket ─────────────────────────────────────────────
    def test_admin_scans_without_saying_which_event(self):
        response = self.admin_client.post(
            self.scan_url, {'qr_token': self.other_ticket.qr_token}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'Valid')
        self.assertEqual(response.data['event_id'], self.other_event.id)
        self.assertEqual(response.data['event_title'], 'Somebody Else Event')
        self.other_ticket.refresh_from_db()
        self.assertEqual(self.other_ticket.status, 'USED')

    def test_admin_scans_with_ticket_id_only(self):
        response = self.admin_client.post(
            self.scan_url, {'ticket_id': self.ticket.id}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'USED')

    def test_admin_can_scan_another_organizers_event(self):
        response = self.admin_client.post(
            self.scan_url,
            {'qr_token': self.other_ticket.qr_token, 'event_id': self.other_event.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['event_title'], 'Somebody Else Event')

    def test_a_second_admin_scan_is_already_used(self):
        payload = {'qr_token': self.ticket.qr_token}
        first = self.admin_client.post(self.scan_url, payload, format='json')
        second = self.admin_client.post(self.scan_url, payload, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(second.data['status'], 'Already Used')

    # ── Organizers keep their old constraints ──────────────────────────────
    def test_organizer_must_still_name_the_event(self):
        response = self.organizer_client.post(
            self.scan_url, {'qr_token': self.ticket.qr_token}, format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'ACTIVE')

    def test_organizer_cannot_scan_another_organizers_ticket(self):
        response = self.organizer_client.post(
            self.scan_url,
            {'qr_token': self.other_ticket.qr_token, 'event_id': self.other_event.id},
            format='json',
        )

        self.assertEqual(response.status_code, 403, response.data)
        self.other_ticket.refresh_from_db()
        self.assertEqual(self.other_ticket.status, 'ACTIVE')

    def test_wrong_event_reports_the_real_event(self):
        response = self.admin_client.post(
            self.scan_url,
            {'qr_token': self.other_ticket.qr_token, 'event_id': self.event.id},
            format='json',
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['status'], 'Wrong Event')
        self.assertEqual(response.data['event_title'], 'Somebody Else Event')

    # ── Manual search ──────────────────────────────────────────────────────
    def test_admin_searches_every_event(self):
        response = self.admin_client.get(self.search_url, {'q': 'Grace'})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['event_title'], 'Somebody Else Event')
        self.assertEqual(response.data[0]['event_id'], self.other_event.id)

    def test_admin_manual_check_in_without_an_event(self):
        response = self.admin_client.post(
            self.scan_url, {'ticket_id': self.other_ticket.id}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.other_ticket.refresh_from_db()
        self.assertEqual(self.other_ticket.status, 'USED')

    def test_organizer_manual_search_still_needs_an_event(self):
        response = self.organizer_client.get(self.search_url, {'q': 'Grace'})

        self.assertEqual(response.status_code, 400)

    def test_organizer_manual_search_stays_inside_their_event(self):
        response = self.organizer_client.get(
            self.search_url, {'event_id': self.other_event.id, 'q': 'Grace'},
        )

        self.assertEqual(response.status_code, 403)
