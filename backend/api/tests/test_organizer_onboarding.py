"""Organizer post-sign-up profile completion.

The popup asks for a full name and phone number once. The name is then locked
because payout bank-account verification depends on it; the phone number stays
editable from Profile Settings.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import OrganizerProfile, User


class OrganizerOnboardingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='neworg', email='neworg@example.com',
            password='password', role='ORGANIZER',
        )
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)

    def _url(self):
        return reverse('organizer_onboarding')

    def _profile(self):
        return OrganizerProfile.objects.get(user=self.user)

    # ── The popup itself ──────────────────────────────────────────────────
    def test_new_organizer_needs_onboarding(self):
        response = self.client_api.get(self._url())

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['needs_onboarding'])
        self.assertEqual(response.data['phone_number'], '')

    def test_full_name_and_phone_are_saved(self):
        response = self.client_api.post(self._url(), {
            'full_name': 'John Doe',
            'phone_number': '08012345678',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['needs_onboarding'])

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'John')
        self.assertEqual(self.user.last_name, 'Doe')

        profile = self._profile()
        self.assertEqual(profile.phone_number, '08012345678')
        self.assertTrue(profile.onboarding_completed)

    def test_full_name_with_one_word_is_rejected(self):
        response = self.client_api.post(self._url(), {
            'full_name': 'John',
            'phone_number': '08012345678',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('first and last name', response.data['error'])
        self.assertFalse(self._profile().onboarding_completed)

    def test_phone_number_is_required(self):
        response = self.client_api.post(self._url(), {
            'full_name': 'John Doe',
            'phone_number': '',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('phone number', response.data['error'].lower())
        self.assertFalse(self._profile().onboarding_completed)

    def test_onboarding_cannot_be_submitted_twice(self):
        self.client_api.post(self._url(), {
            'full_name': 'John Doe', 'phone_number': '08012345678',
        }, format='json')

        response = self.client_api.post(self._url(), {
            'full_name': 'Someone Else', 'phone_number': '08099999999',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.get_full_name(), 'John Doe')

    def test_attendee_cannot_use_the_onboarding_endpoint(self):
        attendee = User.objects.create_user(
            username='onboardattendee', email='onboardattendee@example.com',
            password='password', role='ATTENDEE',
        )
        client = APIClient()
        client.force_authenticate(user=attendee)

        self.assertEqual(client.get(self._url()).status_code, 403)

    # ── Locking rules ─────────────────────────────────────────────────────
    def test_full_name_cannot_be_changed_after_onboarding(self):
        self.client_api.post(self._url(), {
            'full_name': 'John Doe', 'phone_number': '08012345678',
        }, format='json')
        profile = self._profile()

        url = reverse('organizer-profile-detail', args=[profile.id])
        response = self.client_api.patch(
            url, {'organizer_name': 'Jane Doe'}, format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('locked', str(response.data))
        self.user.refresh_from_db()
        self.assertEqual(self.user.get_full_name(), 'John Doe')

    def test_saving_the_same_name_again_is_allowed(self):
        self.client_api.post(self._url(), {
            'full_name': 'John Doe', 'phone_number': '08012345678',
        }, format='json')
        profile = self._profile()

        url = reverse('organizer-profile-detail', args=[profile.id])
        response = self.client_api.patch(
            url,
            {'organizer_name': 'John Doe', 'company_name': 'Doe Events'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['company_name'], 'Doe Events')

    def test_phone_number_stays_editable(self):
        self.client_api.post(self._url(), {
            'full_name': 'John Doe', 'phone_number': '08012345678',
        }, format='json')
        profile = self._profile()

        url = reverse('organizer-profile-detail', args=[profile.id])
        response = self.client_api.patch(
            url, {'phone_number': '08099998888'}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['phone_number'], '08099998888')
        self.assertEqual(response.data['full_name'], 'John Doe')
        self.assertTrue(response.data['name_locked'])

    def test_completed_organizer_is_not_prompted_again(self):
        self.client_api.post(self._url(), {
            'full_name': 'John Doe', 'phone_number': '08012345678',
        }, format='json')

        response = self.client_api.get(self._url())

        self.assertFalse(response.data['needs_onboarding'])
        self.assertTrue(response.data['name_locked'])
        self.assertEqual(response.data['full_name'], 'John Doe')
