"""
Tests for Save/Follow engagement features.
Covers: toggle on/off, auth requirements, list scoping, follower counts.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    User, OrganizerProfile, Event, SavedEvent, FollowedOrganizer,
)


class EngagementTestBase(TestCase):
    def setUp(self):
        self.org_user = User.objects.create_user(
            username='engorg', email='engorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer = OrganizerProfile.objects.create(
            user=self.org_user, company_name='Engagement Test Org',
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Save Test Event',
            capacity=100,
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.user = User.objects.create_user(
            username='enguser', email='enguser@example.com',
            password='password', role='ATTENDEE',
        )

    def get_token(self, user):
        return str(RefreshToken.for_user(user).access_token)


class SaveEventTests(EngagementTestBase):
    def test_save_event_toggle_on(self):
        """First POST creates SavedEvent."""
        token = self.get_token(self.user)
        response = self.client.post(
            reverse('save_event', kwargs={'pk': self.event.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['saved'])
        self.assertTrue(SavedEvent.objects.filter(user=self.user, event=self.event).exists())

    def test_save_event_toggle_off(self):
        """Second POST deletes SavedEvent."""
        token = self.get_token(self.user)
        # Save first
        self.client.post(
            reverse('save_event', kwargs={'pk': self.event.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        # Toggle off
        response = self.client.post(
            reverse('save_event', kwargs={'pk': self.event.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['saved'])
        self.assertFalse(SavedEvent.objects.filter(user=self.user, event=self.event).exists())

    def test_save_event_requires_auth(self):
        """Anonymous → 401."""
        response = self.client.post(
            reverse('save_event', kwargs={'pk': self.event.pk}),
        )
        self.assertEqual(response.status_code, 401)

    def test_saved_events_list(self):
        """Returns only the user's saved events."""
        SavedEvent.objects.create(user=self.user, event=self.event)

        # Create another user's save
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='password',
        )
        event2 = Event.objects.create(
            organizer=self.organizer, title='Other Event',
            capacity=50,
            start_time=timezone.now() + timezone.timedelta(days=14),
            end_time=timezone.now() + timezone.timedelta(days=15),
            status='PUBLISHED',
        )
        SavedEvent.objects.create(user=other_user, event=event2)

        token = self.get_token(self.user)
        response = self.client.get(
            reverse('saved_events'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['event']['title'], 'Save Test Event')


class FollowOrganizerTests(EngagementTestBase):
    def test_follow_organizer_toggle(self):
        """Toggle creates/deletes FollowedOrganizer."""
        token = self.get_token(self.user)
        # Follow
        response = self.client.post(
            reverse('follow_organizer', kwargs={'pk': self.organizer.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['following'])
        self.assertTrue(
            FollowedOrganizer.objects.filter(user=self.user, organizer=self.organizer).exists()
        )

        # Unfollow
        response = self.client.post(
            reverse('follow_organizer', kwargs={'pk': self.organizer.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['following'])

    def test_follow_requires_auth(self):
        """Anonymous → 401."""
        response = self.client.post(
            reverse('follow_organizer', kwargs={'pk': self.organizer.pk}),
        )
        self.assertEqual(response.status_code, 401)

    def test_followed_list_with_counts(self):
        """Response includes follower_count and upcoming_event_count."""
        FollowedOrganizer.objects.create(user=self.user, organizer=self.organizer)

        token = self.get_token(self.user)
        response = self.client.get(
            reverse('followed_organizers'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        result = response.data[0]
        self.assertEqual(result['company_name'], 'Engagement Test Org')
        self.assertIn('follower_count', result)
        self.assertIn('upcoming_event_count', result)
        self.assertEqual(result['follower_count'], 1)
        self.assertEqual(result['upcoming_event_count'], 1)  # Our event is in the future
