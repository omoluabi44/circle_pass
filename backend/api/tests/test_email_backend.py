"""Tests for the Amazon SES email backend."""
from unittest.mock import MagicMock

from django.core.mail import EmailMultiAlternatives
from django.test import TestCase, override_settings

from core.email_backend import SESEmailBackend


@override_settings(DEFAULT_FROM_EMAIL='officialcirclepass@thecirclepass.com')
class SESEmailBackendTests(TestCase):
    def setUp(self):
        self.client = MagicMock()
        self.backend = SESEmailBackend()
        self.backend._client = self.client

    def test_sends_raw_message_with_envelope_recipients(self):
        message = EmailMultiAlternatives(
            subject='Test',
            body='Plain body',
            from_email='officialcirclepass@thecirclepass.com',
            to=['one@example.com'],
            cc=['two@example.com'],
        )
        message.attach_alternative('<p>Html body</p>', 'text/html')

        sent = self.backend.send_messages([message])

        self.assertEqual(sent, 1)
        kwargs = self.client.send_raw_email.call_args.kwargs
        self.assertEqual(kwargs['FromEmailAddress'], 'officialcirclepass@thecirclepass.com')
        self.assertEqual(
            sorted(kwargs['Destination']['ToAddresses']),
            ['one@example.com', 'two@example.com'],
        )
        self.assertIn(b'Html body', kwargs['RawMessage']['Data'])

    def test_raises_when_ses_rejects_and_not_silent(self):
        self.client.send_raw_email.side_effect = Exception('Email address is not verified')
        message = EmailMultiAlternatives('Test', 'body', 'a@b.com', ['c@d.com'])

        with self.assertRaises(Exception):
            self.backend.send_messages([message])

    def test_fail_silently_swallows_errors(self):
        self.client.send_raw_email.side_effect = Exception('boom')
        backend = SESEmailBackend(fail_silently=True)
        backend._client = self.client
        message = EmailMultiAlternatives('Test', 'body', 'a@b.com', ['c@d.com'])

        self.assertEqual(backend.send_messages([message]), 0)
