"""Tests for bot-signup defences."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.spam_guard import (
    is_disposable_email, is_suspicious_email, is_suspicious_username,
    purge_stale_unverified_users, registration_problem,
)
from core.models import User


class SpamHeuristicTests(TestCase):
    def test_disposable_inboxes_are_detected(self):
        self.assertTrue(is_disposable_email('bot@mailinator.com'))
        self.assertTrue(is_disposable_email('bot@sub.yopmail.com'))
        self.assertFalse(is_disposable_email('person@gmail.com'))

    def test_dot_stuffed_gmail_is_suspicious(self):
        self.assertTrue(is_suspicious_email('x.l.h.ok.a.q.8.76@gmail.com'))
        self.assertTrue(is_suspicious_email('name123456@gmail.com'))
        self.assertFalse(is_suspicious_email('john.smith@gmail.com'))
        self.assertFalse(is_suspicious_email('ifeanyi.okafor@outlook.com'))

    def test_random_username_is_suspicious(self):
        self.assertTrue(is_suspicious_username('or6fC1YhKYZEcQJNMZaSeIaPB'))
        self.assertFalse(is_suspicious_username('chukwuemeka2026'))
        self.assertFalse(is_suspicious_username('john_smith'))

    def test_registration_problem_summarises_the_reason(self):
        self.assertIsNotNone(registration_problem('bot@mailinator.com', 'someone'))
        self.assertIsNotNone(registration_problem('x.l.h.ok.a.q.8.76@gmail.com', 'someone'))
        self.assertIsNone(registration_problem('john.smith@gmail.com', 'johnsmith'))


class PurgeUnverifiedUsersTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.stale = User.objects.create_user(
            username='stale', email='stale@example.com', password='x', is_active=False,
        )
        User.objects.filter(pk=self.stale.pk).update(
            date_joined=now - timezone.timedelta(days=5)
        )
        self.fresh = User.objects.create_user(
            username='fresh', email='fresh@example.com', password='x', is_active=False,
        )
        self.active = User.objects.create_user(
            username='active', email='active@example.com', password='x', is_active=True,
        )

    def test_only_old_unverified_accounts_are_removed(self):
        removed = purge_stale_unverified_users(older_than_hours=48)

        self.assertEqual(removed, 1)
        self.assertFalse(User.objects.filter(pk=self.stale.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.fresh.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.active.pk).exists())


class RegistrationEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register(self, username, email):
        return self.client.post('/api/auth/users/', {
            'username': username, 'email': email,
            'password': 'StrongPass123!', 'role': 'ATTENDEE',
        }, format='json')

    def test_disposable_email_is_rejected(self):
        res = self._register('botuser', 'bot@mailinator.com')
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(User.objects.filter(email='bot@mailinator.com').exists())

    def test_dot_stuffed_email_is_rejected(self):
        res = self._register('botuser2', 'x.l.h.ok.a.q.8.76@gmail.com')
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(User.objects.filter(email='x.l.h.ok.a.q.8.76@gmail.com').exists())

    def test_real_signup_still_works(self):
        res = self._register('johnsmith', 'john.smith@gmail.com')
        self.assertIn(res.status_code, (201, 202), res.data)
        self.assertTrue(User.objects.filter(email='john.smith@gmail.com').exists())


class PurgeCommandTests(TestCase):
    def setUp(self):
        self.bot = User.objects.create_user(
            username='or6fC1YhKYZEcQJNMZaSeIaPB',
            email='x.l.h.ok.a.q.8.76@gmail.com',
            password='x', is_active=True,
        )
        self.real = User.objects.create_user(
            username='johnsmith', email='john.smith@gmail.com',
            password='x', is_active=True,
        )

    def test_suspicious_flag_removes_bot_accounts_even_when_verified(self):
        from io import StringIO
        from django.core.management import call_command

        call_command('purge_unverified_users', '--suspicious', stdout=StringIO())

        self.assertFalse(User.objects.filter(pk=self.bot.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.real.pk).exists())

    def test_dry_run_deletes_nothing(self):
        from io import StringIO
        from django.core.management import call_command

        out = StringIO()
        call_command(
            'purge_unverified_users', '--suspicious', '--dry-run', stdout=out,
        )

        self.assertTrue(User.objects.filter(pk=self.bot.pk).exists())
        self.assertIn('would be deleted', out.getvalue())
