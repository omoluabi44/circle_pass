"""Opening the right organizer dashboard from the admin list.

OrganizerProfile ids and User ids are separate sequences that overlap. The
admin list links with a profile id (falling back to a user id), so a lookup
that accepted either one could open a different person's dashboard: profile 27
(Alexzander, the dinner-night host) and user 27 (HypeMan O.Tee) are two
different people.

The ids are pinned explicitly here because both tables assign their own
auto-increment values, which would otherwise make the collision a matter of
luck.
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Event, OrganizerProfile, OrganizerWallet, User


class AdminOrganizerReferenceTests(TestCase):
    COLLIDING_ID = 900001

    def setUp(self):
        self.admin = User.objects.create_user(
            username='refadmin', email='refadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.admin)

    def _user(self, pk, username):
        """An attendee user with a known id.

        Attendee on purpose: ORGANIZER users get a profile from a post_save
        signal, which would take over the id we are assigning here.
        """
        user = User(id=pk, username=username, email=f'{username}@example.com',
                    role='ATTENDEE', is_active=True)
        user.set_password('password')
        user.save(force_insert=True)
        return user

    def _event(self, profile, title):
        return Event.objects.create(
            organizer=profile, title=title, slug=title.lower().replace(' ', '-'),
            capacity=100, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )

    def _collision(self):
        """Profile 900001 (the dinner host) plus a different user 900001."""
        host_user = User.objects.create_user(
            username='dinnerhost', email='dinnerhost@example.com',
            password='password', role='ATTENDEE',
        )
        host_profile = OrganizerProfile.objects.create(
            id=self.COLLIDING_ID, user=host_user, company_name='Dinner Host Events',
        )
        self._event(host_profile, 'NAM TES DINNER NIGHT')

        other_user = self._user(self.COLLIDING_ID, 'otherperson')
        other_profile = OrganizerProfile.objects.create(
            user=other_user, company_name='Other Person Events',
        )
        self._event(other_profile, 'Other Person Event')
        return host_profile, other_profile

    # ── The bug ─────────────────────────────────────────────────────────────
    def test_profile_id_wins_over_a_matching_user_id(self):
        host_profile, other_profile = self._collision()
        self.assertNotEqual(host_profile.id, other_profile.id)

        response = self.api.get(f'/api/admin/organizers/{self.COLLIDING_ID}/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['organizer']['id'], host_profile.id)
        self.assertEqual(response.data['organizer']['company_name'], 'Dinner Host Events')
        titles = [event['title'] for event in response.data['events']]
        self.assertIn('NAM TES DINNER NIGHT', titles)
        self.assertNotIn('Other Person Event', titles)

    def test_wallet_edit_uses_the_same_resolution(self):
        host_profile, other_profile = self._collision()

        response = self.api.patch(
            f'/api/admin/organizers/{self.COLLIDING_ID}/wallet/',
            {'available_balance': 123400}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['organizer_id'], host_profile.id)
        host_wallet = OrganizerWallet.objects.get(organizer=host_profile)
        other_wallet = OrganizerWallet.objects.get(organizer=other_profile)
        self.assertEqual(host_wallet.available_balance, 123400)
        self.assertEqual(other_wallet.available_balance, 0)

    # ── The fallback still works ────────────────────────────────────────────
    def test_a_user_id_resolves_when_no_profile_has_that_id(self):
        user = self._user(800002, 'lateorganizer')
        profile = OrganizerProfile.objects.create(
            user=user, company_name='Late Organizer Events',
        )
        self.assertNotEqual(profile.id, 800002)

        response = self.api.get('/api/admin/organizers/800002/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['organizer']['id'], profile.id)
        self.assertEqual(response.data['organizer']['company_name'], 'Late Organizer Events')

    def test_an_unknown_reference_is_a_404(self):
        response = self.api.get('/api/admin/organizers/999999/')
        self.assertEqual(response.status_code, 404)
