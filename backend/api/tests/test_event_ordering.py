"""Public event listings must run in chronological order."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Event, OrganizerProfile, TicketType, User


class PublicEventOrderingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='orderorg', email='orderorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Order Org'},
        )
        now = timezone.now()

        # Created out of order on purpose, mirroring the bug where a December
        # event appeared above an earlier one.
        self.specs = [
            ('October Event', now + timedelta(days=10)),
            ('December Event', now + timedelta(days=70)),
            ('November Event', now + timedelta(days=35)),
            ('Late December Event', now + timedelta(days=80)),
        ]
        self.events = []
        for title, start in self.specs:
            event = Event.objects.create(
                organizer=self.organizer, title=title,
                slug=title.lower().replace(' ', '-'),
                capacity=50, start_time=start, end_time=start + timedelta(hours=3),
                status='PUBLISHED',
            )
            TicketType.objects.create(
                event=event, tier='REGULAR', name='Regular', price=0, quantity=50,
            )
            self.events.append(event)

        self.client = APIClient()

    def _titles(self, response):
        return [row['title'] for row in response.data]

    def test_public_listing_is_ascending_by_start_time(self):
        res = self.client.get('/api/events/?public=true')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(
            self._titles(res),
            ['October Event', 'November Event', 'December Event', 'Late December Event'],
        )

    def test_upcoming_filter_stays_ascending(self):
        res = self.client.get('/api/events/?public=true&upcoming=true')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(
            self._titles(res),
            ['October Event', 'November Event', 'December Event', 'Late December Event'],
        )

    def test_events_without_a_date_sort_last(self):
        Event.objects.create(
            organizer=self.organizer, title='No Date Yet', slug='no-date-yet',
            capacity=10, start_time=None, end_time=None, status='PUBLISHED',
        )

        res = self.client.get('/api/events/?public=true')

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self._titles(res)[-1], 'No Date Yet')
