"""
Event slugs are the public URL: /events/<slug>.

New events use the event name only (e.g. "Sunset Party" -> "sunset-party").
Existing events are untouched; a duplicate name is rejected instead of being
disambiguated with a random suffix.
"""
from django.test import TestCase
from django.utils import timezone

from api.serializers import EventCreateUpdateSerializer
from core.models import Event, OrganizerProfile, User


class EventSlugTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(
            username='slugorg', email='slugorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=user, defaults={'company_name': 'Slug Org'},
        )

    def _payload(self, title):
        return {
            'title': title,
            'description': 'Test',
            'capacity': 100,
            'event_type': 'PHYSICAL',
            'organizer_contact': '08000000000',
            'emergency_contact': '08000000001',
            'start_time': timezone.now().isoformat(),
            'end_time': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
        }

    def _create(self, title):
        serializer = EventCreateUpdateSerializer(data=self._payload(title))
        serializer.is_valid(raise_exception=True)
        return serializer.save(organizer=self.organizer)

    def test_new_event_slug_is_just_the_name(self):
        event = self._create('Sunset Party')
        self.assertEqual(event.slug, 'sunset-party')

    def test_slug_has_no_random_suffix(self):
        event = self._create('The Big Lagos Concert 2026')
        self.assertEqual(event.slug, 'the-big-lagos-concert-2026')
        self.assertRegex(event.slug, r'^[a-z0-9-]+$')

    def test_duplicate_name_is_rejected(self):
        self._create('Repeated Name')

        serializer = EventCreateUpdateSerializer(data=self._payload('Repeated Name'))
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)
        self.assertIn('already exists', serializer.errors['title'][0].lower())

    def test_existing_event_keeps_its_old_slug_on_edit(self):
        legacy = Event.objects.create(
            organizer=self.organizer, title='Legacy Event',
            slug='legacy-event-a1b2c3', capacity=50,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )

        serializer = EventCreateUpdateSerializer(
            legacy, data={'title': 'Legacy Event Renamed'}, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        legacy.refresh_from_db()
        self.assertEqual(legacy.title, 'Legacy Event Renamed')
        self.assertEqual(legacy.slug, 'legacy-event-a1b2c3')
