"""Signup email-verification flow: resend must hand out a *fresh* code.

Regression: ``_generate_code`` used ``update_or_create`` on a row whose
``created_at`` is ``auto_now_add``, so a resent code inherited the original
timestamp and was already expired when the user typed it in.
"""
import datetime

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.views import CustomUserViewSet
from core.models import EmailVerificationCode, User


class VerificationCodeFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='wavehaus', email='wavehaus@example.com',
            password='StrongPass123!',
        )
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

    def _issue_code(self):
        return CustomUserViewSet()._generate_code(self.user)

    def test_resend_refreshes_expiry(self):
        code = self._issue_code()
        EmailVerificationCode.objects.filter(user=self.user).update(
            created_at=timezone.now() - datetime.timedelta(minutes=45)
        )
        self.assertTrue(EmailVerificationCode.objects.get(user=self.user).is_expired())

        res = self.client.post(
            '/api/auth/users/resend_activation/',
            {'email': self.user.email}, format='json',
        )
        self.assertEqual(res.status_code, 200, res.data)

        verification = EmailVerificationCode.objects.get(user=self.user)
        self.assertFalse(verification.is_expired())
        self.assertNotEqual(verification.code, code)

    def test_resent_code_verifies_and_activates_user(self):
        self._issue_code()
        EmailVerificationCode.objects.filter(user=self.user).update(
            created_at=timezone.now() - datetime.timedelta(minutes=45)
        )
        self.client.post(
            '/api/auth/users/resend_activation/',
            {'email': self.user.email}, format='json',
        )
        fresh = EmailVerificationCode.objects.get(user=self.user).code

        res = self.client.post(
            '/api/auth/verify-code/',
            {'email': self.user.email, 'code': fresh}, format='json',
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('access', res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertFalse(EmailVerificationCode.objects.filter(user=self.user).exists())

    def test_expired_code_is_rejected_with_clear_message(self):
        code = self._issue_code()
        EmailVerificationCode.objects.filter(user=self.user).update(
            created_at=timezone.now() - datetime.timedelta(minutes=45)
        )

        res = self.client.post(
            '/api/auth/verify-code/',
            {'email': self.user.email, 'code': code}, format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('expired', res.data['detail'].lower())
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
