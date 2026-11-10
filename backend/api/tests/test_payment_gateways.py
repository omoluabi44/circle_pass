"""Tests for the switchable Paystack/Nomba payment gateways."""
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Event, OrganizerProfile, Payment, PlatformSetting, Ticket, TicketType, User,
)
from core.utils import nomba

NOMBA_ENV = dict(
    NOMBA_CLIENT_ID='client-id',
    NOMBA_CLIENT_SECRET='client-secret',
    NOMBA_ACCOUNT_ID='account-id',
    NOMBA_WEBHOOK_SECRET='webhook-secret',
    NOMBA_SANDBOX=True,
    PAYSTACK_SECRET_KEY='sk_test_example',
)


class PaymentGatewaySettingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='rootadmin', email='root@example.com',
            password='password', role='ADMIN',
        )
        self.attendee = User.objects.create_user(
            username='attendee', email='attendee@example.com',
            password='password', role='ATTENDEE',
        )
        self.url = reverse('admin_payment_gateway')

    def test_default_gateway_is_paystack_and_row_is_singleton(self):
        setting = PlatformSetting.get_solo()
        self.assertEqual(setting.payment_gateway, 'PAYSTACK')

        PlatformSetting(payment_gateway='NOMBA').save()
        self.assertEqual(PlatformSetting.objects.count(), 1)
        self.assertEqual(PlatformSetting.get_solo().payment_gateway, 'NOMBA')

    @override_settings(**NOMBA_ENV)
    def test_admin_can_switch_gateways(self):
        self.client.force_authenticate(self.admin)

        res = self.client.patch(self.url, {'gateway': 'NOMBA'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['gateway'], 'NOMBA')
        self.assertEqual(PlatformSetting.get_solo().payment_gateway, 'NOMBA')

        res = self.client.patch(self.url, {'gateway': 'PAYSTACK'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(PlatformSetting.get_solo().payment_gateway, 'PAYSTACK')

    def test_non_admin_cannot_read_or_switch(self):
        self.client.force_authenticate(self.attendee)

        self.assertEqual(self.client.get(self.url).status_code, 403)
        res = self.client.patch(self.url, {'gateway': 'NOMBA'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(PlatformSetting.get_solo().payment_gateway, 'PAYSTACK')

    @override_settings(PAYSTACK_SECRET_KEY='sk_test_example', NOMBA_CLIENT_ID='', NOMBA_CLIENT_SECRET='', NOMBA_ACCOUNT_ID='')
    def test_cannot_activate_unconfigured_gateway(self):
        self.client.force_authenticate(self.admin)

        res = self.client.patch(self.url, {'gateway': 'NOMBA'}, format='json')
        self.assertEqual(res.status_code, 400, res.data)
        self.assertEqual(PlatformSetting.get_solo().payment_gateway, 'PAYSTACK')

    def test_rejects_unknown_gateway(self):
        self.client.force_authenticate(self.admin)

        res = self.client.patch(self.url, {'gateway': 'STRIPE'}, format='json')
        self.assertEqual(res.status_code, 400, res.data)


class NombaCheckoutTests(TestCase):
    def setUp(self):
        org_user = User.objects.create_user(
            username='nombaorg', email='nombaorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Nomba Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Nomba Event', capacity=100,
            slug='nomba-event',
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.tier = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=100000, quantity=50,
        )
        PlatformSetting.objects.update_or_create(
            pk=1, defaults={'payment_gateway': 'NOMBA'},
        )

    @override_settings(**NOMBA_ENV)
    def test_checkout_returns_nomba_checkout_link(self):
        with patch(
            'api.views_checkout.nomba.create_checkout_order',
            return_value={
                'checkout_link': 'https://checkout.nomba.com/pay/abc',
                'order_reference': 'nomba-order-id',
                'order_id': 'nomba-order-id',
                'raw': {'code': '00'},
            },
        ):
            res = self.client.post(reverse('orders_checkout'), {
                'event_id': self.event.id,
                'items': [{'ticket_type_id': self.tier.id, 'quantity': 1}],
                'guest_name': 'Buyer Person',
                'guest_email': 'buyer@example.com',
                'guest_phone': '08012345678',
            }, content_type='application/json')

        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['gateway'], 'NOMBA')
        self.assertEqual(res.data['nomba']['checkout_link'], 'https://checkout.nomba.com/pay/abc')
        self.assertEqual(res.data['payment_url'], 'https://checkout.nomba.com/pay/abc')

        payment = Payment.objects.get(reference=res.data['nomba']['reference'])
        self.assertEqual(payment.provider, 'NOMBA')
        self.assertEqual(payment.status, 'PENDING')

    @override_settings(**NOMBA_ENV)
    def test_checkout_keeps_using_paystack_when_selected(self):
        PlatformSetting.objects.filter(pk=1).update(payment_gateway='PAYSTACK')

        with patch(
            'api.views_checkout.initialize_transaction',
            return_value={'data': {
                'access_code': 'abc123',
                'authorization_url': 'https://checkout.paystack.com/abc',
            }},
        ):
            res = self.client.post(reverse('orders_checkout'), {
                'event_id': self.event.id,
                'items': [{'ticket_type_id': self.tier.id, 'quantity': 1}],
                'guest_name': 'Buyer Person',
                'guest_email': 'buyer@example.com',
                'guest_phone': '08012345678',
            }, content_type='application/json')

        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['gateway'], 'PAYSTACK')
        self.assertEqual(res.data['paystack']['access_code'], 'abc123')
        payment = Payment.objects.get(reference=res.data['paystack']['reference'])
        self.assertEqual(payment.provider, 'PAYSTACK')


@override_settings(**NOMBA_ENV)
class NombaWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        org_user = User.objects.create_user(
            username='hookorg', email='hookorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Hook Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Hook Event', capacity=100,
            slug='hook-event',
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.tier = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=100000, quantity=50,
        )
        self.payment = Payment.objects.create(
            order=self._create_order(), reference='CP-1-20261109120000',
            amount=105000, status='PENDING', provider='NOMBA',
        )
        self.url = reverse('nomba_webhook')

    def _create_order(self):
        from core.models import Order, OrderItem

        order = Order.objects.create(
            guest_email='buyer@example.com', guest_name='Buyer',
            event=self.event, subtotal=100000, fee_amount=5000,
            total_amount=105000, status='PENDING',
        )
        OrderItem.objects.create(
            order=order, ticket_type=self.tier, quantity=1,
            unit_price=100000, line_total=100000,
        )
        return order

    def _payload(self, request_id='req-1'):
        return {
            'event_type': 'payment_success',
            'requestId': request_id,
            'data': {
                'merchant': {'userId': 'user-1', 'walletId': 'wallet-1'},
                'transaction': {
                    'transactionId': 'txn-1', 'type': 'online_checkout',
                    'time': '2026-11-09T10:00:00Z', 'responseCode': '',
                },
                'order': {'orderReference': self.payment.reference},
            },
        }

    def _post(self, payload):
        timestamp = '2026-11-09T10:00:01Z'
        signature = nomba.compute_webhook_signature(payload, 'webhook-secret', timestamp)
        return self.client.post(
            self.url, payload, format='json',
            HTTP_NOMBA_SIGNATURE=signature,
            HTTP_NOMBA_TIMESTAMP=timestamp,
        )

    def test_invalid_signature_is_rejected(self):
        res = self.client.post(
            self.url, self._payload(), format='json',
            HTTP_NOMBA_SIGNATURE='bogus',
            HTTP_NOMBA_TIMESTAMP='2026-11-09T10:00:01Z',
        )
        self.assertEqual(res.status_code, 400)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'PENDING')

    def test_success_webhook_verifies_then_fulfils_and_is_idempotent(self):
        payload = self._payload()
        success = {
            'status': 'SUCCESS', 'success': True, 'failed': False,
            'channel': 'card_payment',
            'data': {'status': 'SUCCESS', 'amount': '1050.00'},
            'raw': {'code': '00'},
        }

        with patch('api.views_payment.verify_payment', return_value=success) as verify:
            res = self._post(payload)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(verify.call_count, 1)

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.status, 'SUCCESS')
            self.assertEqual(self.payment.order.status, 'COMPLETED')
            self.assertEqual(Ticket.objects.filter(order=self.payment.order).count(), 1)

            # Replaying the same delivery must not issue more tickets.
            res = self._post(payload)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(verify.call_count, 1)
            self.assertEqual(Ticket.objects.filter(order=self.payment.order).count(), 1)

    def test_webhook_does_not_fulfil_when_verification_fails(self):
        failed = {
            'status': 'PENDING', 'success': False, 'failed': False,
            'channel': '', 'data': None, 'raw': {},
        }
        with patch('api.views_payment.verify_payment', return_value=failed):
            res = self._post(self._payload())

        # 500 asks Nomba to retry instead of silently dropping the event.
        self.assertEqual(res.status_code, 500)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'PENDING')
        self.assertEqual(Ticket.objects.filter(order=self.payment.order).count(), 0)

    def test_other_gateway_payments_are_ignored(self):
        self.payment.provider = 'PAYSTACK'
        self.payment.save(update_fields=['provider'])

        res = self._post(self._payload())
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'PENDING')

    def test_webhook_matches_nomba_generated_order_id(self):
        # Nomba can send its own order ID instead of the reference we supplied.
        self.payment.provider_data = {'orderReference': 'nomba-generated-id'}
        self.payment.save(update_fields=['provider_data'])

        payload = self._payload()
        payload['data']['order'] = {
            'orderReference': 'nomba-generated-id',
            'orderId': 'nomba-generated-id',
        }
        success = {
            'status': 'SUCCESS', 'success': True, 'failed': False,
            'channel': 'card_payment', 'data': {'status': 'SUCCESS'}, 'raw': {},
        }
        with patch('api.views_payment.verify_payment', return_value=success):
            res = self._post(payload)

        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'SUCCESS')


@override_settings(**NOMBA_ENV)
class NombaVerifyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        org_user = User.objects.create_user(
            username='verifyorg', email='verifyorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Verify Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Verify Event', capacity=100,
            slug='verify-event',
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=8),
            status='PUBLISHED',
        )
        self.tier = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=100000, quantity=50,
        )
        from core.models import Order, OrderItem

        self.order = Order.objects.create(
            guest_email='buyer@example.com', guest_name='Buyer',
            event=self.event, subtotal=100000, fee_amount=5000,
            total_amount=105000, status='PENDING',
        )
        OrderItem.objects.create(
            order=self.order, ticket_type=self.tier, quantity=1,
            unit_price=100000, line_total=100000,
        )
        self.payment = Payment.objects.create(
            order=self.order, reference='CP-2-20261109120000',
            amount=105000, status='PENDING', provider='NOMBA',
        )

    def test_verify_fulfils_nomba_payment(self):
        success = {
            'status': 'SUCCESS', 'success': True, 'failed': False,
            'channel': 'bank_transfer',
            'data': {'status': 'SUCCESS'}, 'raw': {},
        }
        with patch('api.views_payment.verify_payment', return_value=success):
            res = self.client.get(
                reverse('payments_verify'), {'reference': self.payment.reference}
            )

        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'SUCCESS')
        self.assertEqual(len(res.data['tickets']), 1)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'SUCCESS')

    def test_verify_reports_pending(self):
        pending = {
            'status': 'PENDING', 'success': False, 'failed': False,
            'channel': '', 'data': None, 'raw': {},
        }
        with patch('api.views_payment.verify_payment', return_value=pending):
            res = self.client.get(
                reverse('payments_verify'), {'reference': self.payment.reference}
            )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'PENDING')

class NombaBankCodeTests(TestCase):
    """Nomba uses different bank codes than Paystack for some fintechs."""

    def test_resolve_bank_code_maps_paystack_codes_to_nomba(self):
        codes = {
            '305': 'Paycom (Opay)',
            '090405': 'Moniepoint Bank',
            '058': 'GTBank',
            '044': 'Access Bank',
        }
        with patch.object(nomba, 'get_bank_codes', return_value=codes):
            self.assertEqual(
                nomba.resolve_bank_code('OPay Digital Services Limited (OPay)', '999992'),
                '305',
            )
            self.assertEqual(
                nomba.resolve_bank_code('Moniepoint MFB', '50515'),
                '090405',
            )
            # Codes that already match are passed through unchanged.
            self.assertEqual(nomba.resolve_bank_code('Guaranty Trust Bank', '058'), '058')
            self.assertEqual(nomba.resolve_bank_code('Access Bank', '044'), '044')

    def test_resolve_bank_code_returns_empty_for_unknown_bank(self):
        with patch.object(nomba, 'get_bank_codes', return_value={'058': 'GTBank'}):
            self.assertEqual(nomba.resolve_bank_code('Nonexistent Bank', '000000'), '')
