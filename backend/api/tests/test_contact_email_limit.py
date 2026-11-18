"""Contact email lives on the organizer profile and can change once a week."""
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Event, OrganizerProfile, User


class ContactEmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='contactorg2', email='signin@example.com',
            password='password', role='ORGANIZER',
        )
        self.profile, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Contact Org'},
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _url(self):
        return reverse('organizer-profile-detail', args=[self.profile.id])

    def _patch(self, **data):
        return self.client.patch(self._url(), data, format='json')

    # ── Defaults ──────────────────────────────────────────────────────────────
    def test_contact_email_defaults_to_the_sign_in_email(self):
        response = self.client.get(self._url())

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['contact_email'], 'signin@example.com')
        self.assertFalse(response.data['contact_email_locked'])

    # ── The 7-day limit ───────────────────────────────────────────────────────
    def test_contact_email_can_be_changed_once(self):
        response = self._patch(contact_email='events@example.com')

        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email, 'events@example.com')
        self.assertIsNotNone(self.profile.contact_email_updated_at)
        self.assertTrue(response.data['contact_email_locked'])
        self.assertIsNotNone(response.data['contact_email_next_change_at'])

    def test_a_second_change_within_seven_days_is_rejected(self):
        self._patch(contact_email='events@example.com')

        response = self._patch(contact_email='other@example.com')

        self.assertEqual(response.status_code, 400)
        self.assertIn('7 days', str(response.data))
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email, 'events@example.com')

    def test_change_is_allowed_again_after_seven_days(self):
        self._patch(contact_email='events@example.com')
        OrganizerProfile.objects.filter(pk=self.profile.pk).update(
            contact_email_updated_at=timezone.now() - timedelta(days=7, hours=1),
        )

        response = self._patch(contact_email='other@example.com')

        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email, 'other@example.com')

    def test_saving_the_same_email_does_not_consume_the_change(self):
        self._patch(contact_email='events@example.com')
        first_change = OrganizerProfile.objects.get(pk=self.profile.pk).contact_email_updated_at

        response = self._patch(contact_email='events@example.com', company_name='Contact Org Renamed')

        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email_updated_at, first_change)

    def test_saving_the_sign_in_email_counts_as_no_change(self):
        # The form pre-fills the sign-in address; saving the rest of the profile
        # must not start the 7-day clock.
        response = self._patch(contact_email='signin@example.com', company_name='Renamed Org')

        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertIsNone(self.profile.contact_email_updated_at)

    def test_blank_submission_keeps_the_current_address(self):
        self._patch(contact_email='events@example.com')
        OrganizerProfile.objects.filter(pk=self.profile.pk).update(
            contact_email_updated_at=timezone.now(),
        )

        response = self._patch(contact_email='')

        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email, 'events@example.com')

    # ── Independence from the event notification email ────────────────────────
    def test_event_notification_email_is_untouched_by_a_profile_change(self):
        event = Event.objects.create(
            organizer=self.profile, title='Independent Event',
            slug='independent-event', capacity=10,
            notification_email='festival@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(days=1),
            status='DRAFT',
        )

        self._patch(contact_email='events@example.com')

        event.refresh_from_db()
        self.assertEqual(event.notification_email, 'festival@example.com')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.contact_email, 'events@example.com')
