"""Email + password sign-in says what actually went wrong.

Guest checkout does not create a login, so buyers who paid had tickets but no
account. The old generic "unable to log in" (and the password-reset "user does
not exist") made them believe they were not in the system at all. These tests
pin the wording and the recovery path.
"""
from datetime import timedelta

from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Event, Order, OrganizerProfile, Ticket, TicketType, User,
)
from core.utils.qr import generate_secure_qr_token


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EmailLoginTests(TestCase):
    def setUp(self):
        mail.outbox = []
        self.client = APIClient()
        self.url = reverse('email_login')

        self.user = User.objects.create_user(
            username='ada', email='ada@example.com', password='CorrectPass123!',
            role='ATTENDEE', is_active=True,
        )

    def _login(self, email, password):
        return self.client.post(
            self.url, {'email': email, 'password': password}, format='json',
        )

    # ── Signing in ──────────────────────────────────────────────────────────
    def test_an_existing_user_can_sign_in(self):
        response = self._login('ada@example.com', 'CorrectPass123!')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'ada@example.com')
        self.assertEqual(response.data['user']['role'], 'ATTENDEE')

    def test_email_case_and_surrounding_spaces_do_not_matter(self):
        response = self._login('  Ada@Example.COM ', 'CorrectPass123!')
        self.assertEqual(response.status_code, 200, response.data)

    def test_admins_report_the_admin_role(self):
        admin = User.objects.create_user(
            username='boss', email='boss@example.com', password='CorrectPass123!',
            role='ATTENDEE', is_staff=True, is_active=True,
        )
        response = self._login('boss@example.com', 'CorrectPass123!')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['role'], 'ADMIN')
        self.assertEqual(response.data['user']['id'], admin.id)

    # ── The messages people actually see ────────────────────────────────────
    def test_a_wrong_password_is_not_reported_as_a_missing_account(self):
        response = self._login('ada@example.com', 'wrong-password')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['code'], 'bad_password')
        self.assertIn('password', response.data['detail'].lower())

    def test_an_unknown_email_without_tickets_is_a_sign_up_hint(self):
        response = self._login('nobody@example.com', 'whatever')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['code'], 'no_account')
        self.assertFalse(response.data['has_tickets'])
        self.assertIn('sign up', response.data['detail'].lower())

    def test_a_guest_buyer_is_told_their_tickets_exist(self):
        self._event_with_guest_order('guest@example.com')

        response = self._login('guest@example.com', 'any-password')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['code'], 'no_account')
        self.assertTrue(response.data['has_tickets'])
        self.assertIn('tickets', response.data['detail'].lower())

    def test_a_google_only_account_is_pointed_at_google(self):
        google_user = User.objects.create(
            username='gmailer', email='gmailer@example.com', role='ATTENDEE',
            is_active=True,
        )
        google_user.set_unusable_password()
        google_user.save()

        response = self._login('gmailer@example.com', 'anything')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['code'], 'use_google')

    def test_an_unverified_account_is_told_to_enter_the_code(self):
        User.objects.filter(pk=self.user.pk).update(is_active=False)

        response = self._login('ada@example.com', 'CorrectPass123!')

        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(response.data['code'], 'unverified')
        self.assertIn('4-digit', response.data['detail'])

    def test_missing_fields_are_rejected(self):
        for payload in (
            {'email': '', 'password': 'x'},
            {'email': 'ada@example.com'},
            {},
        ):
            with self.subTest(payload=payload):
                response = self.client.post(self.url, payload, format='json')
                self.assertEqual(response.status_code, 400, response.data)

    # ── Password reset: no more "does not exist", no token leak ─────────────
    def test_password_reset_gives_a_guest_buyer_an_account_to_reset(self):
        self._event_with_guest_order('buyer@example.com')

        response = self.client.post(
            reverse('user-reset-password'),
            {'email': 'Buyer@Example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('reset_url', response.data)
        user = User.objects.get(email__iexact='buyer@example.com')
        self.assertTrue(user.is_active)
        self.assertTrue(user.has_usable_password())
        self.assertTrue(any('buyer@example.com' in m.to for m in mail.outbox))

    def test_password_reset_never_returns_the_reset_token(self):
        response = self.client.post(
            reverse('user-reset-password'),
            {'email': 'ada@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('reset_url', response.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_password_reset_for_an_unknown_email_stays_quiet(self):
        response = self.client.post(
            reverse('user-reset-password'),
            {'email': 'stranger@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('reset_url', response.data)
        self.assertFalse(User.objects.filter(email__iexact='stranger@example.com').exists())
        self.assertEqual(len(mail.outbox), 0)

    # ── A guest who signs up sees the tickets in the dashboard ──────────────
    def test_attendee_dashboard_counts_guest_tickets_claimed_by_email(self):
        self._event_with_guest_order('ada@example.com', with_ticket=True)

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get(reverse('attendee_dashboard'))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertGreaterEqual(response.data['upcoming_tickets'], 1)

    # ── Helpers ─────────────────────────────────────────────────────────────
    def _event_with_guest_order(self, email, with_ticket=False):
        organizer_user = User.objects.create_user(
            username=f'org-{email}', email=f'org-{email}', password='password',
            role='ORGANIZER',
        )
        organizer, _ = OrganizerProfile.objects.get_or_create(
            user=organizer_user, defaults={'company_name': 'Guest Org'},
        )
        event = Event.objects.create(
            organizer=organizer, title='Guest Event', slug=f'guest-{email}',
            capacity=50, start_time=timezone.now() + timedelta(days=5),
            end_time=timezone.now() + timedelta(days=6), status='PUBLISHED',
        )
        order = Order.objects.create(
            event=event, guest_email=email, guest_name='Guest Person',
            subtotal=0, total_amount=0, status='COMPLETED',
        )
        if with_ticket:
            ticket_type = TicketType.objects.create(
                event=event, tier='FREE', name='Free', price=0, quantity=50,
            )
            Ticket.objects.create(
                order=order, ticket_type=ticket_type,
                attendee_name='Guest Person', attendee_email=email,
                status='ISSUED', qr_token=generate_secure_qr_token(),
            )
        return order
