"""Referral codes: creation, event scoping and sales attribution.

Referrals are tracking-only. These tests cover the organiser-facing CRUD, the
counts shown in Promotions, and the checkout rules: a referral only counts when
it belongs to the event, and it can be used alongside a real discount code.
"""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Discount, Event, Order, OrderItem, OrganizerProfile, PlatformSetting,
    Referral, TicketType, User,
)


class ReferralTests(TestCase):
    def setUp(self):
        cache.clear()
        PlatformSetting.objects.update_or_create(
            pk=1, defaults={'payment_gateway': 'PAYSTACK'},
        )
        self.owner = User.objects.create_user(
            username='refowner', email='refowner@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.owner, defaults={'company_name': 'Ref Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Referral Event',
            slug='referral-event', capacity=100,
            start_time=timezone.now() + timezone.timedelta(days=5),
            end_time=timezone.now() + timezone.timedelta(days=6),
            status='PUBLISHED',
        )
        self.tier = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=100000, quantity=50,
        )

        self.client_admin = APIClient()
        self.client_admin.force_authenticate(user=self.owner)
        self.buyer = APIClient()

    # ── Helpers ───────────────────────────────────────────────────────────
    def _create(self, name='Sarah', code='', **extra):
        payload = {'name': name}
        if code:
            payload['code'] = code
        payload.update(extra)
        return self.client_admin.post(
            reverse('event_referrals', args=[self.event.id]), payload, format='json',
        )

    def _checkout(self, referral_code='', discount_code='', email='buyer@example.com'):
        body = {
            'event_id': self.event.id,
            'items': [{'ticket_type_id': self.tier.id, 'quantity': 1}],
            'guest_name': 'Buyer Person',
            'guest_email': email,
            'guest_phone': '08012345678',
        }
        if referral_code:
            body['referral_code'] = referral_code
        if discount_code:
            body['discount_code'] = discount_code
        with patch('api.views_checkout.initialize_transaction', return_value={'data': {
            'access_code': 'abc', 'authorization_url': 'https://pay.example/abc',
        }}):
            return self.buyer.post(
                reverse('orders_checkout'), body, content_type='application/json',
            )

    def _completed_order(self, referral_code='', email='buyer@example.com'):
        return Order.objects.create(
            event=self.event, guest_email=email, guest_name='Buyer',
            subtotal=100000, total_amount=100000, status='COMPLETED',
            referral_code=referral_code,
        )

    # ── Creation ──────────────────────────────────────────────────────────
    def test_create_with_custom_code_generates_share_link(self):
        response = self._create(name='Sarah', code='sarah25')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['code'], 'SARAH25')
        self.assertEqual(response.data['name'], 'Sarah')
        self.assertEqual(
            response.data['referral_link'],
            'https://thecirclepass.com/events/referral-event?ref=SARAH25',
        )
        self.assertEqual(response.data['sales_count'], 0)

    def test_code_is_generated_from_the_name_when_left_blank(self):
        response = self._create(name='Sarah A.')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['code'], 'SARAHA')

    def test_duplicate_code_is_rejected_on_the_same_event(self):
        self._create(code='SARAH25')
        response = self._create(name='Someone else', code='SARAH25')

        self.assertEqual(response.status_code, 400)
        self.assertIn('already used', response.data['error'])

    def test_code_cannot_shadow_a_discount_code(self):
        Discount.objects.create(
            event=self.event, code='VIP20', type='PERCENTAGE', value=20,
        )
        response = self._create(code='VIP20')

        self.assertEqual(response.status_code, 400)
        self.assertIn('already used', response.data['error'])

    def test_same_code_is_allowed_on_a_different_event(self):
        self._create(code='SARAH25')

        other_event = Event.objects.create(
            organizer=self.organizer, title='Other Referral Event',
            slug='other-referral-event', capacity=10,
            start_time=timezone.now(), end_time=timezone.now(), status='PUBLISHED',
        )
        response = self.client_admin.post(
            reverse('event_referrals', args=[other_event.id]),
            {'name': 'Sarah', 'code': 'SARAH25'}, format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)

    def test_other_organizer_cannot_manage_the_codes(self):
        created = self._create(code='SARAH25')

        outsider = User.objects.create_user(
            username='refoutsider', email='refoutsider@example.com',
            password='password', role='ORGANIZER',
        )
        OrganizerProfile.objects.get_or_create(
            user=outsider, defaults={'company_name': 'Outsider Org'},
        )
        client = APIClient()
        client.force_authenticate(user=outsider)

        self.assertEqual(
            client.get(reverse('event_referrals', args=[self.event.id])).status_code, 403,
        )
        detail_url = reverse(
            'event_referral_detail', args=[self.event.id, created.data['id']],
        )
        self.assertEqual(client.get(detail_url).status_code, 403)

    # ── Tracking ──────────────────────────────────────────────────────────
    def test_sales_count_only_includes_completed_orders(self):
        referral = Referral.objects.create(
            event=self.event, name='Sarah', code='SARAH25',
        )
        self._completed_order('SARAH25')
        self._completed_order('sarah25')
        self._completed_order('SARAH25', email='other@example.com')
        Order.objects.create(
            event=self.event, guest_email='pending@example.com', guest_name='Pending',
            subtotal=1000, total_amount=1000, status='PENDING', referral_code='SARAH25',
        )

        self.assertEqual(referral.sales_count(), 3)

    def test_sales_are_scoped_to_the_event(self):
        referral = Referral.objects.create(
            event=self.event, name='Sarah', code='SARAH25',
        )
        other_event = Event.objects.create(
            organizer=self.organizer, title='Other Referral Event',
            slug='other-referral-event', capacity=10,
            start_time=timezone.now(), end_time=timezone.now(), status='PUBLISHED',
        )
        Order.objects.create(
            event=other_event, guest_email='x@example.com', guest_name='X',
            subtotal=1000, total_amount=1000, status='COMPLETED', referral_code='SARAH25',
        )

        self.assertEqual(referral.sales_count(), 0)

    def test_ticket_count_counts_passes_not_orders(self):
        referral = Referral.objects.create(
            event=self.event, name='Sarah', code='SARAH25',
        )
        order = self._completed_order('SARAH25')
        OrderItem.objects.create(
            order=order, ticket_type=self.tier, quantity=3,
            unit_price=100000, line_total=300000,
        )

        self.assertEqual(referral.sales_count(), 1)
        self.assertEqual(referral.ticket_count(), 3)

    # ── Checkout attribution ──────────────────────────────────────────────
    def test_checkout_records_a_referral_from_this_event(self):
        Referral.objects.create(event=self.event, name='Sarah', code='SARAH25')

        response = self._checkout(referral_code='sarah25')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        self.assertEqual(order.referral_code, 'SARAH25')

    def test_checkout_ignores_a_code_from_another_event(self):
        other_event = Event.objects.create(
            organizer=self.organizer, title='Other Referral Event',
            slug='other-referral-event', capacity=10,
            start_time=timezone.now(), end_time=timezone.now(), status='PUBLISHED',
        )
        Referral.objects.create(event=other_event, name='Sarah', code='SARAH25')

        response = self._checkout(referral_code='SARAH25')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        self.assertEqual(order.referral_code, '')

    def test_checkout_ignores_an_unknown_code(self):
        response = self._checkout(referral_code='NOSUCHCODE')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        self.assertEqual(Order.objects.latest('id').referral_code, '')

    def test_discount_and_referral_can_be_used_together(self):
        Discount.objects.create(
            event=self.event, code='TENOFF', type='PERCENTAGE', value=10,
        )
        Referral.objects.create(event=self.event, name='Sarah', code='SARAH25')

        response = self._checkout(discount_code='TENOFF', referral_code='SARAH25')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        # ₦1,000 ticket, 10% off, referral recorded but never priced.
        self.assertEqual(order.discount_amount, 10000)
        self.assertEqual(order.total_amount, 94500)  # 90,000 + 5% fee
        self.assertEqual(order.referral_code, 'SARAH25')

    def test_legacy_referral_discount_row_is_still_attributed(self):
        # Rows created before the Referrals section existed.
        Discount.objects.create(
            event=self.event, code='U20', type='REFERRAL', value=0,
        )

        response = self._checkout(referral_code='U20')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        self.assertEqual(Order.objects.latest('id').referral_code, 'U20')
