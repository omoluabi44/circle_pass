import json
from unittest.mock import patch
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
import hmac
import hashlib
from django.conf import settings

from core.models import (
    User, OrganizerProfile, OrganizerWallet, Event, TicketType,
    Order, Payment, OrganizerBankAccount, Payout, WalletTransaction, EventCategory, Venue
)
from core.utils.fulfillment import fulfill_order
from api.views_payout import calculate_paystack_transfer_fee

class FinancialFlowTests(APITestCase):
    def setUp(self):
        # Create Organizer
        self.organizer_user = User.objects.create_user(
            username='org_test', email='org@test.com', password='password', role='ORGANIZER'
        )
        self.profile = OrganizerProfile.objects.get(user=self.organizer_user)
        self.wallet = OrganizerWallet.objects.get(organizer=self.profile)
        
        # Create Buyer
        self.buyer_user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='password', role='ATTENDEE'
        )
        
        # Setup Event
        self.category = EventCategory.objects.create(name='Test Cat', slug='test-cat')
        self.venue = Venue.objects.create(name='Test Venue', address='123 Test St')
        self.event = Event.objects.create(
            organizer=self.profile,
            title='Test Event',
            slug='test-event',
            event_type='PHYSICAL',
            category=self.category,
            venue=self.venue,
            start_time=timezone.now() + timezone.timedelta(days=1),
            end_time=timezone.now() + timezone.timedelta(days=1, hours=2),
            status='PUBLISHED'
        )
        self.tier = TicketType.objects.create(
            event=self.event,
            name='Regular',
            price=1000000, # 10,000 NGN
            capacity=100
        )

        
        # Create Bank Account
        self.bank_account = OrganizerBankAccount.objects.create(
            organizer=self.profile,
            bank_name='Access Bank',
            bank_code='044',
            account_number='0000000000',
            account_name='Test Account',
            paystack_recipient_code='RCP_12345',
            is_default=True
        )

    def test_fulfillment_credits_95_percent_to_available_balance(self):
        """Test that fulfilling a paid order credits exactly 95% directly to available_balance."""
        # Create an order
        order = Order.objects.create(
            user=self.buyer_user,
            event=self.event,
            subtotal=1000000,
            fee_amount=50000, # 5% circlepass fee (charged to buyer in this scenario)
            total_amount=1050000,
            status='PENDING'
        )
        payment = Payment.objects.create(
            order=order,
            reference='PAY_123',
            amount=1050000,
            status='SUCCESS'
        )
        
        # Fulfill
        fulfill_order(order, payment=payment)
        
        self.wallet.refresh_from_db()
        
        # Organizer gets 95% of what customer paid (1,050,000 * 0.95 = 997,500)
        expected_credit = int(1050000 * 0.95)
        self.assertEqual(self.wallet.available_balance, expected_credit)
        self.assertEqual(self.wallet.total_earnings, expected_credit)
        self.assertEqual(self.wallet.pending_balance, 0)
        
        # Check Ledger
        tx = WalletTransaction.objects.filter(wallet=self.wallet).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.type, 'CREDIT')
        self.assertEqual(tx.amount, expected_credit)
        self.assertEqual(tx.balance_after, expected_credit)
        self.assertIn('CirclePass fee', tx.description)

    def test_dynamic_payout_fee_calculation(self):
        """Test the tiered Paystack fee calculation."""
        # <= 5,000 NGN (500,000 kobo) -> 10 NGN (1,000 kobo)
        self.assertEqual(calculate_paystack_transfer_fee(200000), 1000)
        self.assertEqual(calculate_paystack_transfer_fee(500000), 1000)
        
        # 5,001 - 50,000 NGN -> 25 NGN (2,500 kobo)
        self.assertEqual(calculate_paystack_transfer_fee(500100), 2500)
        self.assertEqual(calculate_paystack_transfer_fee(5000000), 2500)
        
        # > 50,000 NGN -> 50 NGN (5,000 kobo)
        self.assertEqual(calculate_paystack_transfer_fee(5000100), 5000)
        self.assertEqual(calculate_paystack_transfer_fee(10000000), 5000)

    @patch('api.views_payout.initiate_transfer')
    def test_payout_request_reserves_balance_and_initiates_transfer(self, mock_initiate):
        """Test that requesting a payout correctly reserves the balance and initiates transfer."""
        mock_initiate.return_value = 'TRF_12345'
        
        # Fund wallet
        self.wallet.available_balance = 500000 # 5,000 NGN
        self.wallet.save()
        
        self.client.force_authenticate(user=self.organizer_user)
        response = self.client.post('/api/organizer/payouts/', {
            'amount': 200000, # Requesting 2,000 NGN
            'bank_account_id': self.bank_account.id
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 300000) # 5k - 2k = 3k
        
        payout = Payout.objects.first()
        self.assertEqual(payout.amount, 200000)
        self.assertEqual(payout.payout_charge, 1000) # 10 NGN fee
        self.assertEqual(payout.amount_received, 199000) # 1990 NGN
        self.assertEqual(payout.status, 'PROCESSING')
        self.assertEqual(payout.paystack_transfer_code, 'TRF_12345')
        
        # Check Ledger
        tx = WalletTransaction.objects.filter(type='PAYOUT').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, 200000)
        self.assertEqual(tx.balance_after, 300000)

    def _send_webhook(self, event, transfer_code, simulate_status):
        payload = {
            "event": event,
            "data": {
                "id": 99999,
                "amount": 199000,
                "transfer_code": transfer_code,
                "status": simulate_status,
                "reason": "Test reason" if simulate_status != "success" else ""
            }
        }
        body = json.dumps(payload)
        sig = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        return self.client.post(
            '/api/payments/paystack/webhook/', 
            data=body, 
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE=sig
        )

    def test_transfer_success_webhook(self):
        """Test that a transfer.success webhook completes the payout."""
        payout = Payout.objects.create(
            wallet=self.wallet,
            bank_account=self.bank_account,
            amount=200000,
            payout_charge=1000,
            amount_received=199000,
            status='PROCESSING',
            reference='PO_TEST_1',
            paystack_transfer_code='TRF_SUCCESS'
        )
        
        response = self._send_webhook('transfer.success', 'TRF_SUCCESS', 'success')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        payout.refresh_from_db()
        self.wallet.refresh_from_db()
        
        self.assertEqual(payout.status, 'SUCCESSFUL')
        self.assertIsNotNone(payout.processed_at)
        self.assertEqual(self.wallet.total_payouts, 200000)

    def test_transfer_failed_webhook_refunds_balance(self):
        """Test that a transfer.failed webhook refunds the organizer's available balance."""
        self.wallet.available_balance = 300000
        self.wallet.save()
        
        payout = Payout.objects.create(
            wallet=self.wallet,
            bank_account=self.bank_account,
            amount=200000,
            payout_charge=1000,
            amount_received=199000,
            status='PROCESSING',
            reference='PO_TEST_2',
            paystack_transfer_code='TRF_FAIL'
        )
        
        response = self._send_webhook('transfer.failed', 'TRF_FAIL', 'failed')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        payout.refresh_from_db()
        self.wallet.refresh_from_db()
        
        self.assertEqual(payout.status, 'FAILED')
        self.assertEqual(payout.failure_reason, 'Test reason')
        # Balance refunded: 3,000 + 2,000 = 5,000
        self.assertEqual(self.wallet.available_balance, 500000) 
        
        # Check Ledger for reversal
        tx = WalletTransaction.objects.filter(type='REVERSAL').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, 200000)
        self.assertEqual(tx.balance_after, 500000)
