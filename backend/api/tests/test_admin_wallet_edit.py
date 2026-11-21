"""Super admins can correct an organizer's wallet balance from the dashboard.

Only the balances sent are changed, every change leaves a ledger entry with the
admin's email on it, and nobody below admin can call it.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import (
    OrganizerProfile, OrganizerWallet, User, WalletTransaction,
)


class AdminWalletBalanceEditTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='walletadmin', email='walletadmin@example.com',
            password='password', role='ADMIN', is_staff=True,
        )
        org_user = User.objects.create_user(
            username='walletorg', email='walletorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Wallet Org'},
        )
        self.wallet, _ = OrganizerWallet.objects.get_or_create(
            organizer=self.organizer,
        )
        OrganizerWallet.objects.filter(pk=self.wallet.pk).update(
            available_balance=18700000, total_earnings=18700000,
        )
        self.wallet.refresh_from_db()

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)
        self.url = reverse(
            'admin_organizer_wallet', kwargs={'pk': self.organizer.pk},
        )

    # ── The edit ────────────────────────────────────────────────────────────
    def test_admin_sets_the_available_balance(self):
        response = self.admin_client.patch(
            self.url,
            {'available_balance': 14300000, 'reason': 'NGN 44,000 already sent'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['wallet']['available_balance'], 14300000)
        # Earnings and payouts are left alone.
        self.assertEqual(response.data['wallet']['total_earnings'], 18700000)
        self.assertEqual(response.data['wallet']['total_payouts'], 0)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 14300000)

    def test_the_change_is_written_to_the_wallet_history(self):
        self.admin_client.patch(
            self.url,
            {'available_balance': 14300000, 'reason': 'NGN 44,000 already sent'},
            format='json',
        )

        entry = WalletTransaction.objects.get(wallet=self.wallet)
        self.assertEqual(entry.type, 'REVERSAL')
        self.assertEqual(entry.amount, 4400000)
        self.assertEqual(entry.balance_after, 14300000)
        self.assertTrue(entry.reference.startswith(f'ADMIN-{self.admin.id}-'))
        self.assertIn('walletadmin@example.com', entry.description)
        self.assertIn('NGN 44,000 already sent', entry.description)

    def test_admin_can_raise_a_balance_too(self):
        response = self.admin_client.patch(
            self.url, {'available_balance': 25000000}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 25000000)

    def test_admin_can_set_the_pending_balance_as_well(self):
        response = self.admin_client.patch(
            self.url,
            {'available_balance': 14300000, 'pending_balance': 500000},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 14300000)
        self.assertEqual(self.wallet.pending_balance, 500000)
        self.assertEqual(WalletTransaction.objects.filter(wallet=self.wallet).count(), 2)

    def test_matching_the_current_value_changes_nothing(self):
        response = self.admin_client.patch(
            self.url, {'available_balance': 18700000}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['changes'], [])
        self.assertIn('No change', response.data['message'])
        self.assertFalse(WalletTransaction.objects.filter(wallet=self.wallet).exists())

    # ── Guards ──────────────────────────────────────────────────────────────
    def test_bad_amounts_are_rejected(self):
        for payload in (
            {'available_balance': -1},
            {'available_balance': 'not-a-number'},
            {'available_balance': 10 ** 13},
            {'available_balance': ''},
            {'total_earnings': 500},
        ):
            with self.subTest(payload=payload):
                response = self.admin_client.patch(self.url, payload, format='json')
                self.assertEqual(response.status_code, 400, response.data)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 18700000)

    def test_an_organizer_cannot_edit_their_own_balance(self):
        org_user = self.organizer.user
        client = APIClient()
        client.force_authenticate(user=org_user)

        response = client.patch(
            self.url, {'available_balance': 999000000}, format='json',
        )

        self.assertIn(response.status_code, (401, 403))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 18700000)

    def test_signed_out_requests_are_rejected(self):
        response = APIClient().patch(
            self.url, {'available_balance': 999000000}, format='json',
        )

        self.assertIn(response.status_code, (401, 403))

    def test_unknown_organizer_is_a_404(self):
        response = self.admin_client.patch(
            reverse('admin_organizer_wallet', kwargs={'pk': 999999}),
            {'available_balance': 1000}, format='json',
        )

        self.assertEqual(response.status_code, 404)
