"""Amazon SES email backend.

Third-party relays enforce small daily quotas (SendGrid's free plan stops after
100 emails/day and then rejects every send), while SES gives 50,000/day from the
same AWS account already used for S3. Switch with::

    EMAIL_BACKEND=core.email_backend.SESEmailBackend

The ``From`` address must be a verified SES identity — either the whole domain
(DKIM CNAMEs) or that single address.

This mirrors Django's SMTP backend surface so every existing ``send_mail`` call
keeps working, including HTML alternatives and attachments.
"""
import logging

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)


class SESEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently)
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3

            self._client = boto3.client(
                'sesv2',
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
            )
        return self._client

    def open(self):
        # boto3 manages its own connection pool.
        return None

    def close(self):
        return None

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent = 0
        for message in email_messages:
            from_email = message.from_email or settings.DEFAULT_FROM_EMAIL
            envelope = list(
                dict.fromkeys(
                    list(message.to or []) + list(getattr(message, 'cc', []) or [])
                    + list(getattr(message, 'bcc', []) or [])
                )
            )
            try:
                self.client.send_raw_email(
                    FromEmailAddress=from_email,
                    Destination={'ToAddresses': envelope},
                    RawMessage={'Data': message.message().as_bytes()},
                )
                sent += 1
            except Exception as exc:
                logger.error(
                    'SES rejected email to %s: %s', ', '.join(envelope), exc
                )
                if not self.fail_silently:
                    raise
        return sent
