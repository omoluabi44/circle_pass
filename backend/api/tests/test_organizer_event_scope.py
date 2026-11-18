"""The organizer workspace only shows the events you actually run.

Admin status must not leak another organizer's events into someone's personal
dashboard, and management endpoints must reject events you do not own.
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Event, OrganizerProfile, TeamMember, User


class OrganizerEventScopeTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='scopeowner', email='owner@example.com',
            password='password', role='ORGANIZER',
        )
        self.owner_profile, _ = OrganizerProfile.objects.get_or_create(
            user=self.owner, defaults={'company_name': 'Owner Org'},
        )
        self.other = User.objects.create_user(
            username='scopeother', email='other@example.com',
            password='password', role='ORGANIZER',
        )
        self.other_profile, _ = OrganizerProfile.objects.get_or_create(
            user=self.other, defaults={'company_name': 'Other Org'},
        )
        self.admin = User.objects.create_user(
            username='scopeadmin', email='admin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        self.admin_profile, _ = OrganizerProfile.objects.get_or_create(
            user=self.admin, defaults={'company_name': 'Admin Org'},
        )

        self.mine = self._event(self.owner_profile, 'My Event', 'my-event')
        self.theirs = self._event(self.other_profile, 'Their Event', 'their-event')
        self.admin_event = self._event(
            self.admin_profile, 'Admin Event', 'admin-event',
        )

    def _event(self, organizer, title, slug):
        return Event.objects.create(
            organizer=organizer, title=title, slug=slug,
            capacity=50, notification_email='events@example.com',
            start_time=timezone.now() + timezone.timedelta(days=2),
            end_time=timezone.now() + timezone.timedelta(days=3),
            status='PUBLISHED',
        )

    def _client(self, user):
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}',
        )
        return client

    def _titles(self, user):
        response = self._client(user).get('/api/events/')
        self.assertEqual(response.status_code, 200)
        rows = response.data['results'] if isinstance(response.data, dict) else response.data
        return {row['title'] for row in rows}

    # ── The list is personal ─────────────────────────────────────────────────
    def test_organizer_only_sees_their_own_events(self):
        self.assertEqual(self._titles(self.owner), {'My Event'})

    def test_admin_dashboard_does_not_list_every_organizers_events(self):
        # The admin account owns one event; the platform-wide list lives in the
        # admin area instead of the personal organizer workspace.
        self.assertEqual(self._titles(self.admin), {'Admin Event'})

    def test_active_team_member_sees_the_event_they_help_run(self):
        member = User.objects.create_user(
            username='scopemember', email='member@example.com',
            password='password', role='ATTENDEE',
        )
        TeamMember.objects.create(
            organizer=self.owner_profile, event=self.mine, user=member,
            email='member@example.com', status='ACTIVE', role='SCANNER_STAFF',
            token='scope-team-member-token-1234567890',
        )

        self.assertEqual(self._titles(member), {'My Event'})

    def test_public_listing_still_shows_published_events(self):
        response = APIClient().get('/api/events/?public=true')
        self.assertEqual(response.status_code, 200)
        rows = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertTrue({'My Event', 'Their Event'} <= {r['title'] for r in rows})

    # ── Management endpoints require ownership ──────────────────────────────
    def test_another_organizer_cannot_open_overview(self):
        response = self._client(self.owner).get(
            f'/api/events/{self.theirs.id}/overview/',
        )

        self.assertEqual(response.status_code, 403)

    def test_owner_can_open_their_own_overview(self):
        response = self._client(self.owner).get(
            f'/api/events/{self.mine.id}/overview/',
        )

        self.assertEqual(response.status_code, 200, response.data)

    def test_another_organizer_cannot_edit(self):
        response = self._client(self.owner).patch(
            f'/api/events/{self.theirs.id}/', {'title': 'Hijacked'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.theirs.refresh_from_db()
        self.assertEqual(self.theirs.title, 'Their Event')

    def test_admin_can_still_support_organizers(self):
        response = self._client(self.admin).get(
            f'/api/events/{self.theirs.id}/overview/',
        )

        self.assertEqual(response.status_code, 200, response.data)
