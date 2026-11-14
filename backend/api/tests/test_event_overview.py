"""
Organizer event overview powers the Manage Event dashboard header, including
the Share menu.

Regression guard: the overview payload must include the event's slug, otherwise
organisers have no public link to copy or turn into a QR code straight after
creating an event.
"""
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Event, OrganizerProfile, User


class EventOverviewSlugTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        organiser = User.objects.create_user(
            username='overvieworg', email='overvieworg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=organiser, defaults={'company_name': 'Overview Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Shareable Event',
            slug='shareable-event', capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.client.force_authenticate(user=organiser)

    def test_overview_includes_event_slug(self):
        response = self.client.get(f'/api/events/{self.event.id}/overview/')

        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))
        self.assertEqual(response.data['slug'], 'shareable-event')
        self.assertEqual(response.data['title'], 'Shareable Event')
        # Existing stats must keep working alongside the new field.
        self.assertEqual(response.data['total_capacity'], 100)
        self.assertIn('sales_paused', response.data)
