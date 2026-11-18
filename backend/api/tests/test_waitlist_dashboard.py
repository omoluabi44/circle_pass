"""Waitlist requests belong to the attendee who made them.

The attendee dashboard shows waitlist activity. Requests used to be found only
by the email typed into the form, so a signed-in attendee who used another
address saw an empty panel; entries now link to the account as well.
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    Event, OrganizerProfile, TicketType, User, WaitlistEntry,
)


class WaitlistDashboardTests(TestCase):
    def setUp(self):
        organizer_user = User.objects.create_user(
            username='wlorg', email='wlorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=organizer_user, defaults={'company_name': 'Waitlist Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Sold Out Night', slug='sold-out-night',
            capacity=10, notification_email='wl@example.com',
            waitlist_enabled=True,
            start_time=timezone.now() + timezone.timedelta(days=3),
            end_time=timezone.now() + timezone.timedelta(days=4),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=500000, quantity=10, quantity_sold=10,
        )

        self.attendee = User.objects.create_user(
            username='wlattendee', email='attendee@example.com',
            password='password', role='ATTENDEE',
        )
        self.client = APIClient()
        token = str(RefreshToken.for_user(self.attendee).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _join(self, email='attendee@example.com'):
        return self.client.post(
            f'/api/events/{self.event.id}/waitlist/',
            {'email': email, 'name': 'Attendee', 'phone': '08012345678',
             'ticket_type_id': self.ticket_type.id, 'quantity': 2},
            format='json',
        )

    def _dashboard(self):
        response = self.client.get('/api/attendee/dashboard/')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    # ── Joining while signed in ──────────────────────────────────────────────
    def test_joining_while_signed_in_links_the_account(self):
        response = self._join()

        self.assertEqual(response.status_code, 201, response.data)
        entry = WaitlistEntry.objects.get(email='attendee@example.com')
        self.assertEqual(entry.user, self.attendee)

    def test_waitlist_shows_on_the_dashboard(self):
        self._join()

        data = self._dashboard()

        self.assertEqual(len(data['waitlist_entries']), 1)
        entry = data['waitlist_entries'][0]
        self.assertEqual(entry['event_title'], 'Sold Out Night')
        self.assertEqual(entry['status'], 'PENDING')
        self.assertEqual(entry['quantity'], 2)
        self.assertEqual(data['waitlist_count'], 1)

    def test_request_follows_the_account_even_with_another_email(self):
        # Signed-in attendee using a different address in the form: the request
        # must still reach their dashboard.
        self._join(email='personal@example.com')

        data = self._dashboard()

        self.assertEqual(len(data['waitlist_entries']), 1)
        self.assertEqual(data['waitlist_entries'][0]['event_title'], 'Sold Out Night')

    # ── Requests made without an account ─────────────────────────────────────
    def test_guest_request_with_the_same_email_is_shown(self):
        WaitlistEntry.objects.create(
            event=self.event, ticket_type=self.ticket_type,
            name='Guest', email='ATTENDEE@example.com', quantity=1,
        )

        data = self._dashboard()

        self.assertEqual(len(data['waitlist_entries']), 1)

    def test_other_peoples_requests_are_not_shown(self):
        WaitlistEntry.objects.create(
            event=self.event, ticket_type=self.ticket_type,
            name='Someone', email='someone@example.com', quantity=1,
        )

        data = self._dashboard()

        self.assertEqual(data['waitlist_entries'], [])
        self.assertEqual(data['waitlist_count'], 0)

    # ── Status handling ──────────────────────────────────────────────────────
    def test_closed_requests_are_listed_but_not_counted_as_active(self):
        WaitlistEntry.objects.create(
            event=self.event, user=self.attendee, ticket_type=self.ticket_type,
            name='Attendee', email='attendee@example.com',
            quantity=1, status='DECLINED',
        )
        WaitlistEntry.objects.create(
            event=self.event, user=self.attendee, ticket_type=self.ticket_type,
            name='Attendee', email='attendee@example.com',
            quantity=1, status='PENDING',
        )

        data = self._dashboard()

        statuses = sorted(e['status'] for e in data['waitlist_entries'])
        self.assertEqual(statuses, ['DECLINED', 'PENDING'])
        self.assertEqual(data['waitlist_count'], 1)
