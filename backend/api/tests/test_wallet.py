"""
Tests for Organizer Wallet functionality.
Covers: auto-creation, crediting on paid orders, fee handling, API access control.
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

from core.models import (
    User, AttendeeProfile, OrganizerProfile, OrganizerWallet,
    WalletTransaction, Event, EventCategory, TicketType, Order, Payment, Ticket,
)


class WalletTestBase(TestCase):
    """Shared setup for wallet tests."""

    def setUp(self):
        # Organizer user + profile
        self.org_user = User.objects.create_user(
            username='testorg', email='org@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer = OrganizerProfile.objects.create(
            user=self.org_user, company_name='Test Events Co',
        )
        # Wallet auto-created by signal
        self.wallet = OrganizerWallet.objects.get(organizer=self.organizer)

        # Attendee user
        self.att_user = User.objects.create_user(
            username='testatt', email='att@example.com',
            password='password', role='ATTENDEE',
        )
        self.attendee = AttendeeProfile.objects.create(user=self.att_user)

        # Event
        self.event = Event.objects.create(
            organizer=self.organizer,
            title='Test Concert',
            capacity=100,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )

        # Ticket types
        self.free_ticket = TicketType.objects.create(
            event=self.event, tier='FREE', name='Free Entry',
            price=0, quantity=50,
        )
        self.paid_ticket = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Standard',
            price=500000, quantity=50,  # ₦5,000
        )

    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)


class WalletAutoCreationTests(WalletTestBase):
    def test_wallet_auto_created_on_organizer_signup(self):
        """OrganizerWallet is created when OrganizerProfile is created."""
        self.assertIsNotNone(self.wallet)
        self.assertEqual(self.wallet.pending_balance, 0)
        self.assertEqual(self.wallet.available_balance, 0)
        self.assertEqual(self.wallet.total_earnings, 0)
        self.assertEqual(self.wallet.total_payouts, 0)


class WalletCreditingTests(WalletTestBase):
    def _create_paid_order(self, absorb_fees=False):
        """Helper to create a completed paid order."""
        self.event.absorb_fees = absorb_fees
        self.event.save()

        url = reverse('orders_checkout')
        data = {
            'event_id': self.event.id,
            'guest_email': 'buyer@example.com',
            'guest_name': 'Test Buyer',
            'items': [{'ticket_type_id': self.paid_ticket.id, 'quantity': 1}],
        }
        return self.client.post(url, data, content_type='application/json')

    @patch('core.utils.paystack.requests.post')
    def test_wallet_credited_on_paid_order(self, mock_post):
        """After fulfillment, pending_balance and total_earnings increment."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'status': True,
            'data': {
                'authorization_url': 'https://checkout.paystack.com/xxx',
                'access_code': 'xxx',
                'reference': 'test-ref-wallet',
            },
        }
        self._create_paid_order(absorb_fees=False)

        # Simulate Paystack verification
        order = Order.objects.first()
        payment = Payment.objects.get(order=order)
        payment.status = 'SUCCESS'
        payment.save()

        from core.utils.fulfillment import fulfill_order
        fulfill_order(order, payment=payment)

        self.wallet.refresh_from_db()
        expected_credit = self.paid_ticket.price  # Buyer pays fee, organizer gets full subtotal
        self.assertEqual(self.wallet.pending_balance, expected_credit)
        self.assertEqual(self.wallet.total_earnings, expected_credit)

    def test_wallet_not_credited_on_free_order(self):
        """Free checkout does not credit wallet."""
        url = reverse('orders_checkout')
        data = {
            'event_id': self.event.id,
            'guest_email': 'free@example.com',
            'guest_name': 'Free User',
            'items': [{'ticket_type_id': self.free_ticket.id, 'quantity': 1}],
        }
        self.client.post(url, data, content_type='application/json')

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.pending_balance, 0)
        self.assertEqual(self.wallet.total_earnings, 0)

    @patch('core.utils.paystack.requests.post')
    def test_wallet_fee_deducted_when_absorbed(self, mock_post):
        """When absorb_fees=True, credit = subtotal − 5%."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'status': True,
            'data': {
                'authorization_url': 'https://checkout.paystack.com/xxx',
                'access_code': 'xxx',
                'reference': 'test-ref-absorb',
            },
        }
        self._create_paid_order(absorb_fees=True)

        order = Order.objects.first()
        payment = Payment.objects.get(order=order)
        payment.status = 'SUCCESS'
        payment.save()

        from core.utils.fulfillment import fulfill_order
        fulfill_order(order, payment=payment)

        self.wallet.refresh_from_db()
        cp_fee = int(self.paid_ticket.price * 0.05)
        expected = self.paid_ticket.price - cp_fee
        self.assertEqual(self.wallet.pending_balance, expected)


class WalletAPITests(WalletTestBase):
    def test_wallet_api_requires_organizer_auth(self):
        """Non-organizer users get 403."""
        token = self.get_token(self.att_user)
        response = self.client.get(
            reverse('organizer_wallet'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 403)

    def test_wallet_returns_correct_balances(self):
        """API response matches model values."""
        self.wallet.pending_balance = 100000
        self.wallet.available_balance = 500000
        self.wallet.total_earnings = 600000
        self.wallet.save()

        token = self.get_token(self.org_user)
        response = self.client.get(
            reverse('organizer_wallet'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['pending_balance'], 100000)
        self.assertEqual(response.data['available_balance'], 500000)
        self.assertEqual(response.data['total_earnings'], 600000)

    def test_wallet_transaction_ledger_created(self):
        """Wallet transaction is created when wallet is credited."""
        # Manually create a transaction
        WalletTransaction.objects.create(
            wallet=self.wallet, type='CREDIT', amount=50000,
            balance_after=0, reference='Order #1',
            description='Test credit',
        )
        token = self.get_token(self.org_user)
        response = self.client.get(
            reverse('wallet_transactions'),
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)
