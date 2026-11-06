"""Tests for discount/referral usage counting."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Discount, DiscountRedemption, Event, Order, OrganizerProfile, TicketType, User,
)


class DiscountUsageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='discountorg', email='discountorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Discount Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Discount Event', slug='discount-event',
            capacity=100, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )
        TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=0, quantity=100,
        )
        self.discount = Discount.objects.create(
            event=self.event, code='U20', type='PERCENTAGE', value=20,
            usage_limit=30,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _order(self, status='COMPLETED', referral_code=''):
        return Order.objects.create(
            event=self.event, guest_email='buyer@example.com', guest_name='Buyer',
            subtotal=0, total_amount=0, status=status, referral_code=referral_code,
        )

    def _redeem(self, order):
        DiscountRedemption.objects.create(discount=self.discount, order=order)

    def test_counts_completed_referral_orders(self):
        self._order(referral_code='U20')
        self._order(referral_code='u20')  # case-insensitive match
        self.assertEqual(self.discount.completed_usage_count(), 2)

    def test_counts_discount_redemptions(self):
        order = self._order()
        self._redeem(order)
        self.assertEqual(self.discount.completed_usage_count(), 1)

    def test_same_order_is_counted_once_when_both_paths_match(self):
        order = self._order(referral_code='U20')
        self._redeem(order)
        self.assertEqual(self.discount.completed_usage_count(), 1)

    def test_pending_and_failed_orders_are_not_counted(self):
        self._order(status='PENDING', referral_code='U20')
        self._order(status='FAILED', referral_code='U20')
        self.assertEqual(self.discount.completed_usage_count(), 0)

    def test_api_reports_actual_usage_not_stale_counter(self):
        self._order(referral_code='U20')
        self._order(referral_code='U20')
        self._order(status='PENDING', referral_code='U20')

        res = self.client.get(f'/api/events/{self.event.id}/discounts/')
        self.assertEqual(res.status_code, 200, res.data)
        row = next(r for r in res.data if r['code'] == 'U20')
        self.assertEqual(row['usage_count'], 2)
        self.assertEqual(row['times_used'], 2)
        self.assertEqual(row['usage_limit'], 30)

    def test_validate_rejects_code_at_limit_through_referrals(self):
        self.discount.usage_limit = 2
        self.discount.save(update_fields=['usage_limit'])
        self._order(referral_code='U20')
        self._order(referral_code='U20')

        res = self.client.get(
            f'/api/events/{self.event.id}/discounts/validate/?code=U20'
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn('usage limit', res.data['error'].lower())
