"""
Discount codes: class targeting, per-user limits and pause/resume.

The organiser form lets a code apply to specific ticket classes, decides whether
a buyer can reuse it, and can pause a code without deleting it.
"""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Discount, DiscountRedemption, Event, Order, OrganizerProfile,
    PlatformSetting, TicketType, User,
)


class DiscountTargetingTests(TestCase):
    def setUp(self):
        cache.clear()
        PlatformSetting.objects.update_or_create(
            pk=1, defaults={'payment_gateway': 'PAYSTACK'},
        )
        self.organizer_user = User.objects.create_user(
            username='targetdiscorg', email='targetdiscorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.organizer_user, defaults={'company_name': 'Target Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Target Discount Event',
            slug='target-discount-event', capacity=100,
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.vip = TicketType.objects.create(
            event=self.event, tier='VIP', name='VIP', price=100000, quantity=20,
        )
        self.regular = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=50000, quantity=50,
        )

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.organizer_user)
        self.client = APIClient()

    def _create(self, **overrides):
        payload = {
            'code': 'VIP20',
            'type': 'PERCENTAGE',
            'value': 20,
            'usage_limit': 0,
            'ticket_type_ids': [self.vip.id],
            'allow_multiple_per_user': True,
        }
        payload.update(overrides)
        return self.admin_client.post(
            reverse('event_discounts', args=[self.event.id]), payload, format='json',
        )

    def _checkout(self, tier, quantity=1, email='buyer@example.com', code=''):
        body = {
            'event_id': self.event.id,
            'items': [{'ticket_type_id': tier.id, 'quantity': quantity}],
            'guest_name': 'Buyer Person',
            'guest_email': email,
            'guest_phone': '08012345678',
        }
        if code:
            body['discount_code'] = code
        with patch('api.views_checkout.initialize_transaction', return_value={'data': {
            'access_code': 'abc', 'authorization_url': 'https://pay.example/abc',
        }}):
            return self.client.post(
                reverse('orders_checkout'), body, content_type='application/json',
            )

    # ── Creation / management ─────────────────────────────────────────────

    def test_create_stores_ticket_classes_and_multiple_use(self):
        response = self._create(allow_multiple_per_user=False)

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        discount = Discount.objects.get(pk=response.data['id'])
        self.assertEqual(discount.ticket_type_ids, [self.vip.id])
        self.assertFalse(discount.allow_multiple_per_user)

    def test_ticket_class_from_another_event_is_rejected(self):
        other_event = Event.objects.create(
            organizer=self.organizer, title='Other Discount Event',
            slug='other-discount-event', capacity=10,
            start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )
        other_tier = TicketType.objects.create(
            event=other_event, tier='VIP', name='Other VIP', price=1000, quantity=5,
        )

        response = self._create(ticket_type_ids=[other_tier.id])

        self.assertEqual(response.status_code, 400)
        self.assertIn('do not belong', response.data['error'])

    def test_percentage_must_be_positive(self):
        response = self._create(value=0)

        self.assertEqual(response.status_code, 400)
        self.assertIn('greater than zero', response.data['error'])

    def test_pause_and_resume_keeps_the_code(self):
        created = self._create()
        discount_id = created.data['id']
        url = reverse('event_discount_detail', args=[self.event.id, discount_id])

        paused = self.admin_client.patch(url, {'is_active': False}, format='json')
        self.assertEqual(paused.status_code, 200, paused.data)
        self.assertFalse(paused.data['is_active'])

        discount = Discount.objects.get(pk=discount_id)
        self.assertEqual(discount.ticket_type_ids, [self.vip.id])

        resumed = self.admin_client.patch(url, {'is_active': True}, format='json')
        self.assertEqual(resumed.status_code, 200, resumed.data)
        self.assertTrue(resumed.data['is_active'])

    # ── Checkout behaviour ────────────────────────────────────────────────

    def test_discount_only_counts_eligible_ticket_classes(self):
        Discount.objects.create(
            event=self.event, code='VIP20', type='PERCENTAGE', value=20,
            ticket_type_ids=[self.vip.id],
        )

        # ₦1,000 VIP + ₦500 Regular -> 20% of VIP only = ₦200.
        body = {
            'event_id': self.event.id,
            'items': [
                {'ticket_type_id': self.vip.id, 'quantity': 1},
                {'ticket_type_id': self.regular.id, 'quantity': 1},
            ],
            'guest_name': 'Buyer Person',
            'guest_email': 'buyer@example.com',
            'guest_phone': '08012345678',
            'discount_code': 'VIP20',
        }
        with patch('api.views_checkout.initialize_transaction', return_value={'data': {
            'access_code': 'abc', 'authorization_url': 'https://pay.example/abc',
        }}):
            response = self.client.post(
                reverse('orders_checkout'), body, content_type='application/json',
            )

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        self.assertEqual(order.subtotal, 150000)
        self.assertEqual(order.discount_amount, 20000)

    def test_fixed_discount_is_capped_at_eligible_subtotal(self):
        Discount.objects.create(
            event=self.event, code='BIG', type='FIXED', value=500000,
            ticket_type_ids=[self.regular.id],
        )

        response = self._checkout(self.regular, code='BIG')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        self.assertEqual(order.discount_amount, 50000)

    def test_using_the_code_on_an_ineligible_class_is_rejected(self):
        Discount.objects.create(
            event=self.event, code='VIP20', type='PERCENTAGE', value=20,
            ticket_type_ids=[self.vip.id],
        )

        response = self._checkout(self.regular, code='VIP20')

        self.assertEqual(response.status_code, 400)
        self.assertIn('only applies to', response.data['detail'])
        self.assertFalse(Order.objects.exists())

    def test_single_use_code_is_blocked_for_a_repeat_buyer(self):
        discount = Discount.objects.create(
            event=self.event, code='ONCE', type='PERCENTAGE', value=10,
            allow_multiple_per_user=False,
        )
        previous = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=100000, total_amount=100000,
            status='COMPLETED',
        )
        DiscountRedemption.objects.create(discount=discount, order=previous)

        response = self._checkout(self.vip, code='ONCE')

        self.assertEqual(response.status_code, 400)
        self.assertIn('once per person', response.data['detail'])

    def test_multiple_use_code_allows_a_repeat_buyer(self):
        discount = Discount.objects.create(
            event=self.event, code='MANY', type='PERCENTAGE', value=10,
            allow_multiple_per_user=True,
        )
        previous = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer Person', subtotal=100000, total_amount=100000,
            status='COMPLETED',
        )
        DiscountRedemption.objects.create(discount=discount, order=previous)

        response = self._checkout(self.vip, code='MANY')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))

    def test_paused_code_cannot_be_used(self):
        Discount.objects.create(
            event=self.event, code='PAUSED', type='PERCENTAGE', value=20,
            is_active=False,
        )

        response = self._checkout(self.vip, code='PAUSED')

        self.assertEqual(response.status_code, 201, getattr(response, 'data', None))
        order = Order.objects.latest('id')
        self.assertEqual(order.discount_amount, 0)

    # ── Validation endpoint ───────────────────────────────────────────────

    def test_validate_returns_ticket_classes_for_checkout_display(self):
        Discount.objects.create(
            event=self.event, code='VIP20', type='PERCENTAGE', value=20,
            ticket_type_ids=[self.vip.id],
        )

        response = self.client.get(
            reverse('event_discount_validate', args=[self.event.id]) + '?code=VIP20'
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['ticket_type_ids'], [self.vip.id])

    def test_validate_blocks_repeat_buyer_when_single_use(self):
        discount = Discount.objects.create(
            event=self.event, code='ONCE', type='PERCENTAGE', value=10,
            allow_multiple_per_user=False,
        )
        previous = Order.objects.create(
            event=self.event, guest_email='buyer@example.com',
            guest_name='Buyer', subtotal=100, total_amount=100, status='COMPLETED',
        )
        DiscountRedemption.objects.create(discount=discount, order=previous)

        response = self.client.get(
            reverse('event_discount_validate', args=[self.event.id])
            + '?code=ONCE&email=buyer@example.com'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('once per person', response.data['error'])
