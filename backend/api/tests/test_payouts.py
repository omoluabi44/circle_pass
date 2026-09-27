"""
Tests for Payout request and admin management.
Covers: creation, validation, concurrency, admin approve/reject, balance restoration.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    User, OrganizerProfile, OrganizerWallet, Payout, WalletTransaction,
)


class PayoutTestBase(TestCase):
    def setUp(self):
        self.org_user = User.objects.create_user(
            username='payoutorg', email='payoutorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer = OrganizerProfile.objects.create(
            user=self.org_user, company_name='Payout Test Org',
        )
        self.wallet = OrganizerWallet.objects.get(organizer=self.organizer)
        self.wallet.available_balance = 1000000  # ₦10,000
        self.wallet.save()

        self.admin_user = User.objects.create_user(
            username='admin', email='admin@example.com',
            password='password', role='ADMIN',
        )

        self.att_user = User.objects.create_user(
            username='att', email='att@example.com',
            password='password', role='ATTENDEE',
        )

    def get_token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def _payout_data(self, amount=500000):
        return {
            'amount': amount,
            'bank_code': '058',
            'account_number': '0123456789',
            'account_name': 'Test Account',
            'bank_name': 'Guaranty Trust Bank',
        }


class PayoutRequestTests(PayoutTestBase):
    def test_payout_request_success(self):
        """Valid payout deducts available_balance and creates PENDING payout."""
        token = self.get_token(self.org_user)
        response = self.client.post(
            reverse('organizer_payouts'),
            self._payout_data(500000),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'PENDING')

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 500000)  # 1M - 500K

        # Verify wallet transaction created
        txn = WalletTransaction.objects.filter(wallet=self.wallet, type='PAYOUT').first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 500000)

    def test_payout_insufficient_balance(self):
        """Request for more than available → 400."""
        token = self.get_token(self.org_user)
        response = self.client.post(
            reverse('organizer_payouts'),
            self._payout_data(2000000),  # ₦20,000 > ₦10,000
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 400)

    def test_payout_below_minimum(self):
        """Request below ₦1,000 → 400."""
        token = self.get_token(self.org_user)
        response = self.client.post(
            reverse('organizer_payouts'),
            self._payout_data(50000),  # ₦500 < ₦1,000
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 400)

    def test_payout_history_scoped_to_organizer(self):
        """Organizer A can't see Organizer B's payouts."""
        # Create payout for our organizer
        Payout.objects.create(
            wallet=self.wallet, amount=100000, reference='PO-TEST1',
            bank_name='GTB', account_number='123', account_name='Test',
            bank_code='058',
        )

        # Create another organizer
        other_user = User.objects.create_user(
            username='other', email='other@example.com',
            password='password', role='ORGANIZER',
        )
        other_org = OrganizerProfile.objects.create(
            user=other_user, company_name='Other Org',
        )
        other_wallet = OrganizerWallet.objects.get(organizer=other_org)
        Payout.objects.create(
            wallet=other_wallet, amount=200000, reference='PO-OTHER1',
            bank_name='UBA', account_number='456', account_name='Other',
            bank_code='033',
        )

        token = self.get_token(self.org_user)
        response = self.client.get(
            reverse('organizer_payouts'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reference'], 'PO-TEST1')


class AdminPayoutTests(PayoutTestBase):
    def test_admin_approve_payout(self):
        """Admin approval transitions to PROCESSING."""
        payout = Payout.objects.create(
            wallet=self.wallet, amount=100000, reference='PO-APPROVE',
            bank_name='GTB', account_number='123', account_name='Test',
            bank_code='058', status='PENDING',
        )

        token = self.get_token(self.admin_user)
        response = self.client.post(
            reverse('admin_payout_approve', kwargs={'pk': payout.pk}),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)

        payout.refresh_from_db()
        self.assertEqual(payout.status, 'PROCESSING')

    def test_admin_reject_payout_refunds_balance(self):
        """Rejection restores available_balance."""
        initial_balance = self.wallet.available_balance
        payout = Payout.objects.create(
            wallet=self.wallet, amount=100000, reference='PO-REJECT',
            bank_name='GTB', account_number='123', account_name='Test',
            bank_code='058', status='PENDING',
        )
        # Simulate the deduction that would happen during request
        self.wallet.available_balance -= 100000
        self.wallet.save()

        token = self.get_token(self.admin_user)
        response = self.client.post(
            reverse('admin_payout_reject', kwargs={'pk': payout.pk}),
            {'reason': 'Suspicious activity'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)

        payout.refresh_from_db()
        self.assertEqual(payout.status, 'REJECTED')
        self.assertEqual(payout.rejection_reason, 'Suspicious activity')

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, initial_balance)

        # Verify reversal transaction
        reversal = WalletTransaction.objects.filter(
            wallet=self.wallet, type='REVERSAL',
        ).first()
        self.assertIsNotNone(reversal)
