"""
Tests for Payout request and admin management.
Covers: creation, validation, concurrency, admin approve/reject, balance restoration.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    User, OrganizerProfile, AttendeeProfile, OrganizerWallet, Payout, WalletTransaction,
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


class BankAccountNameValidationTests(TestCase):
    """Tests for validating organizer name against resolved bank account name."""

    def setUp(self):
        self.org_user = User.objects.create_user(
            username='acmeorg', email='acme@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(user=self.org_user)
        self.organizer.company_name = 'Acme Events'
        self.organizer.save(update_fields=['company_name'])

    def get_token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def test_is_organizer_bank_name_match_helper(self):
        from core.utils.transfers import is_organizer_bank_name_match

        # Exact & case-insensitive matches
        self.assertTrue(is_organizer_bank_name_match('Acme Events', 'ACME EVENTS'))
        self.assertTrue(is_organizer_bank_name_match('John Doe', 'DOE, JOHN'))
        # Middle name on bank account with >= 2 organizer tokens
        self.assertTrue(is_organizer_bank_name_match('John Doe', 'DOE JOHN OLUMIDE'))
        # Mismatches
        self.assertFalse(is_organizer_bank_name_match('Acme Events', 'JOHN DOE'))
        self.assertFalse(is_organizer_bank_name_match('Acme Events', 'ACME TECHNOLOGIES'))
        self.assertFalse(is_organizer_bank_name_match('John', 'JOHN DOE'))
        self.assertFalse(is_organizer_bank_name_match('', 'JOHN DOE'))

    def test_bank_name_matches_personal_name_not_only_company(self):
        from core.utils.transfers import is_bank_name_valid_for_organizer

        self.org_user.first_name = 'Jubril'
        self.org_user.last_name = 'Olamilekan Ogunbiyi'
        self.org_user.save(update_fields=['first_name', 'last_name'])
        self.organizer.company_name = 'Jubril Olami Events'
        self.organizer.save(update_fields=['company_name'])

        # Bank account belongs to the person, whose name differs from the brand.
        self.assertTrue(
            is_bank_name_valid_for_organizer(self.organizer, 'JUBRIL OLAMILEKAN OGUNBIYI')
        )
        # Company bank accounts remain valid.
        self.assertTrue(
            is_bank_name_valid_for_organizer(self.organizer, 'JUBRIL OLAMI EVENTS')
        )
        # A completely unrelated name is still rejected.
        self.assertFalse(
            is_bank_name_valid_for_organizer(self.organizer, 'MERCY TEMITOPE')
        )

    def test_add_bank_account_rejected_when_name_mismatches(self):
        from unittest.mock import patch
        from core.models import OrganizerBankAccount

        token = self.get_token(self.org_user)
        with patch('api.views_bank_account.resolve_account_number') as mock_resolve, \
             patch('api.views_bank_account.create_transfer_recipient') as mock_recipient:
            mock_resolve.return_value = {
                'account_number': '0123456789',
                'account_name': 'JOHN DOE',
            }

            response = self.client.post(
                reverse('bank_accounts'),
                {
                    'bank_code': '058',
                    'bank_name': 'Guaranty Trust Bank',
                    'account_number': '0123456789',
                },
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}',
            )

            self.assertEqual(response.status_code, 400)
            self.assertTrue(response.data.get('name_mismatch'))
            self.assertIn('does not match your organizer name', response.data.get('detail', ''))
            mock_recipient.assert_not_called()
            self.assertEqual(OrganizerBankAccount.objects.filter(organizer=self.organizer).count(), 0)

    def test_add_bank_account_succeeds_when_name_matches(self):
        from unittest.mock import patch
        from core.models import OrganizerBankAccount

        token = self.get_token(self.org_user)
        with patch('api.views_bank_account.resolve_account_number') as mock_resolve, \
             patch('api.views_bank_account.create_transfer_recipient') as mock_recipient:
            mock_resolve.return_value = {
                'account_number': '0123456789',
                'account_name': 'ACME EVENTS',
            }
            mock_recipient.return_value = 'RCP_test123'

            response = self.client.post(
                reverse('bank_accounts'),
                {
                    'bank_code': '058',
                    'bank_name': 'Guaranty Trust Bank',
                    'account_number': '0123456789',
                },
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}',
            )

            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data['account_name'], 'ACME EVENTS')
            self.assertEqual(OrganizerBankAccount.objects.filter(organizer=self.organizer).count(), 1)

    def test_resolve_account_endpoint_rejects_mismatch_until_updated(self):
        from unittest.mock import patch, MagicMock

        token = self.get_token(self.org_user)
        mock_res = MagicMock()
        mock_res.json.return_value = {
            'status': True,
            'message': 'Account number resolved',
            'data': {
                'account_number': '0123456789',
                'account_name': 'JOHN DOE',
            },
        }

        with patch('api.views_payout.requests.get', return_value=mock_res):
            # 1. Fails while company_name is 'Acme Events'
            res1 = self.client.post(
                reverse('resolve_account'),
                {'bank_code': '058', 'account_number': '0123456789'},
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}',
            )
            self.assertEqual(res1.status_code, 400)
            self.assertTrue(res1.data.get('name_mismatch'))

            # 2. Update organizer name to 'John Doe' and retry -> succeeds
            self.organizer.company_name = 'John Doe'
            self.organizer.save(update_fields=['company_name'])

            res2 = self.client.post(
                reverse('resolve_account'),
                {'bank_code': '058', 'account_number': '0123456789'},
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {token}',
            )
            self.assertEqual(res2.status_code, 200)
            self.assertEqual(res2.data['data']['account_name'], 'JOHN DOE')

