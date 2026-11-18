"""Wallet reconciliation tooling.

Correcting a dashboard balance after money was sent outside CirclePass must
change only what it is asked to change, must not fire a real transfer, and must
never record the same payout twice.
"""
import io
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from core.models import (
    Event, Order, OrganizerProfile, OrganizerWallet, Payout, TicketType,
    User, WalletTransaction,
)


class WalletReconciliationTests(TestCase):
    def setUp(self):
        self.org_user = User.objects.create_user(
            username='paidorg', email='paidorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.org_user, defaults={'company_name': 'Paid Org'},
        )
        self.wallet, _ = OrganizerWallet.objects.get_or_create(
            organizer=self.organizer,
        )
        # The profile signal creates the wallet with zeros; give it the
        # dashboard balance the reconciliation commands have to correct.
        OrganizerWallet.objects.filter(pk=self.wallet.pk).update(
            available_balance=18700000, total_earnings=18700000,
        )
        self.wallet.refresh_from_db()
        self.event = Event.objects.create(
            organizer=self.organizer, title='Paid Event', slug='paid-event',
            capacity=100, notification_email='paid@example.com',
            start_time=timezone.now() + timedelta(days=3),
            end_time=timezone.now() + timedelta(days=4),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=500000, quantity=50,
        )

    def _paid_order(self, subtotal, fee_amount):
        order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com', guest_name='Buyer',
            subtotal=subtotal, fee_amount=fee_amount,
            total_amount=subtotal + fee_amount, status='COMPLETED',
        )
        return order

    def _run(self, *args, **kwargs):
        out = io.StringIO()
        call_command(*args, stdout=out, **kwargs)
        return out.getvalue()

    # ── setting one balance ─────────────────────────────────────────────────
    def test_set_available_balance_changes_only_that_field(self):
        output = self._run(
            'set_available_balance',
            organizer='paidorg@example.com', amount='143000',
        )

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 14300000)
        self.assertEqual(self.wallet.total_earnings, 18700000)  # untouched
        self.assertEqual(self.wallet.total_payouts, 0)           # untouched
        self.assertIn('143,000.00', output)

    def test_set_available_balance_supports_commas_and_dry_run(self):
        output = self._run(
            'set_available_balance',
            organizer='paidorg@example.com', amount='143,000.50', dry_run=True,
        )

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 18700000)  # unchanged
        self.assertIn('DRY RUN', output)
        self.assertIn('143,000.50', output)

    # ── recording a payout already sent ─────────────────────────────────────
    def test_recording_a_manual_payout_deducts_and_audits(self):
        self._run(
            'record_manual_payouts',
            organizer='paidorg@example.com', amount='44000',
            date='2026-11-05', note='GTB transfer', dry_run=True,
        )
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 18700000)  # dry run

        self._run(
            'record_manual_payouts',
            organizer='paidorg@example.com', amount='44000',
            date='2026-11-05', note='GTB transfer',
        )

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, 14300000)
        self.assertEqual(self.wallet.total_payouts, 4400000)

        payout = Payout.objects.get(wallet=self.wallet)
        self.assertEqual(payout.status, 'SUCCESSFUL')
        self.assertEqual(payout.provider, 'MANUAL')
        self.assertEqual(payout.amount, 4400000)
        self.assertEqual(payout.processed_at.strftime('%Y-%m-%d'), '2026-11-05')

        entry = WalletTransaction.objects.get(wallet=self.wallet, type='PAYOUT')
        self.assertEqual(entry.amount, 4400000)
        self.assertEqual(entry.balance_after, self.wallet.available_balance)
        self.assertEqual(entry.related_payout_id, payout.id)

    def test_the_same_payout_is_never_recorded_twice(self):
        self._run(
            'record_manual_payouts', organizer='paidorg@example.com',
            amount='44000', date='2026-11-05',
        )
        self._run(
            'record_manual_payouts', organizer='paidorg@example.com',
            amount='44000', date='2026-11-05',
        )

        self.wallet.refresh_from_db()
        self.assertEqual(Payout.objects.filter(wallet=self.wallet).count(), 1)
        self.assertEqual(self.wallet.available_balance, 14300000)

    def test_the_audit_flags_a_balance_orders_do_not_support(self):
        # ₦5,000 of real sales, but the dashboard says ₦187,000.
        self._paid_order(subtotal=500000, fee_amount=0)

        output = self._run('wallet_audit', organizer='paidorg@example.com')

        self.assertIn('true available', output.lower())
        self.assertIn('OVERSTATED', output)
        self.assertIn('4,750.00', output)     # 95% of the ₦5,000 order
        self.assertIn('187,000.00', output)   # what the dashboard shows

    def test_the_audit_is_quiet_when_everything_adds_up(self):
        order = self._paid_order(subtotal=500000, fee_amount=0)
        self.wallet.available_balance = order.total_amount - int(order.total_amount * 0.05)
        self.wallet.save(update_fields=['available_balance'])

        output = self._run('wallet_audit', organizer='paidorg@example.com')

        self.assertIn('reconcile with orders and payouts', output)
