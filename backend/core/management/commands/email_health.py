"""Diagnose outgoing email delivery.

Usage:
    python manage.py email_health
    python manage.py email_health --send-to you@example.com

Checks the configured SMTP relay, and — when SendGrid is in use — the account
plan and remaining daily credits, which is the most common reason mail silently
stops being delivered.
"""
import smtplib

import requests
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Check outgoing email configuration and optionally send a test email.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-to',
            dest='send_to',
            help='Attempt a real send to this address and report the result.',
        )

    def handle(self, *args, **options):
        self.stdout.write(f'EMAIL_BACKEND:      {settings.EMAIL_BACKEND}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')

        is_ses = 'SESEmailBackend' in (settings.EMAIL_BACKEND or '')
        if is_ses:
            self._check_ses()
        else:
            self.stdout.write(f'EMAIL_HOST:         {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
            self.stdout.write(f'TLS/SSL:            {settings.EMAIL_USE_TLS}/{settings.EMAIL_USE_SSL}')
            self.stdout.write(f'EMAIL_HOST_USER:    {settings.EMAIL_HOST_USER}')
            self.stdout.write(f'Password set:       {bool(settings.EMAIL_HOST_PASSWORD)}')
            self._check_smtp()
            if 'sendgrid' in (settings.EMAIL_HOST or '').lower():
                self._check_sendgrid()

        recipient = options.get('send_to')
        if recipient:
            self._send(recipient)

    def _check_ses(self):
        import boto3

        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        self.stdout.write(f'SES region:         {region}')
        try:
            ses = boto3.client('sesv2', region_name=region)
            account = ses.get_account()
            quota = account.get('SendQuota') or {}
            self.stdout.write(
                f'SES sending:        enabled={account.get("SendingEnabled")} '
                f'production={account.get("ProductionAccessEnabled")}'
            )
            self.stdout.write(
                f'SES quota:          {quota.get("SentLast24Hours")} sent / '
                f'{quota.get("Max24HourSend")} per 24h'
            )
            identities = ses.list_email_identities().get('EmailIdentities', [])
            verified = [
                i['IdentityName'] for i in identities if i.get('SendingEnabled')
            ]
            self.stdout.write(f'SES verified:       {verified or "none"}')
            if settings.DEFAULT_FROM_EMAIL not in verified:
                self.stdout.write(self.style.ERROR(
                    f'SES: {settings.DEFAULT_FROM_EMAIL} is not verified for sending. '
                    'Verify the domain (DKIM CNAMEs) or the single address.'
                ))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'SES: {type(exc).__name__}: {exc}'))

    def _check_smtp(self):
        try:
            connection = get_connection()
            connection.open()
            connection.close()
            self.stdout.write(self.style.SUCCESS('SMTP: connection + login OK'))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(
                f'SMTP: FAILED — {type(exc).__name__}: {exc}'
            ))

    def _check_sendgrid(self):
        key = settings.EMAIL_HOST_PASSWORD
        headers = {'Authorization': f'Bearer {key}'}
        try:
            account = requests.get(
                'https://api.sendgrid.com/v3/user/account',
                headers=headers, timeout=15,
            ).json()
            credits = requests.get(
                'https://api.sendgrid.com/v3/user/credits',
                headers=headers, timeout=15,
            ).json()
            senders = requests.get(
                'https://api.sendgrid.com/v3/verified_senders',
                headers=headers, timeout=15,
            ).json()
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'SendGrid API: {exc}'))
            return

        self.stdout.write(f'SendGrid plan:      {account.get("type")}')
        self.stdout.write(
            'SendGrid credits:   '
            f'{credits.get("remain")} left of {credits.get("total")} '
            f'(used {credits.get("used")}, resets {credits.get("next_reset")}, '
            f'hard limit {credits.get("is_hard_limit")})'
        )
        if credits.get('remain', 0) <= 0:
            self.stdout.write(self.style.ERROR(
                'SendGrid: OUT OF EMAIL CREDITS — all sends will fail with '
                '"Maximum credits exceeded" until the plan is upgraded or the '
                'daily credit window resets.'
            ))

        verified = [
            s.get('from_email') for s in (senders.get('results') or [])
            if s.get('verified')
        ]
        self.stdout.write(f'Verified senders:   {verified or "none"}')
        if settings.DEFAULT_FROM_EMAIL not in verified:
            self.stdout.write(self.style.WARNING(
                f'SendGrid: {settings.DEFAULT_FROM_EMAIL} is not a verified sender.'
            ))

    def _send(self, recipient):
        try:
            sent = send_mail(
                'CirclePass email test',
                'If you can read this, CirclePass email delivery is working.',
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                fail_silently=False,
            )
        except smtplib.SMTPException as exc:
            self.stdout.write(self.style.ERROR(
                f'Send to {recipient}: FAILED — {type(exc).__name__}: {exc}'
            ))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(
                f'Send to {recipient}: FAILED — {type(exc).__name__}: {exc}'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Send to {recipient}: accepted by the relay ({sent} message(s))'
            ))
