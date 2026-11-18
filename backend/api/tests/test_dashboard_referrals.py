"""Organizer dashboard referral panel.

Every referral code the organizer created must be listed even before it sells;
codes that only exist on completed orders stay visible too.
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    Event, Order, OrderItem, OrganizerProfile, Referral, TicketType, User,
)


class DashboardReferralTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='dashorg', email='dash@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Dash Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Dash Event', slug='dash-event',
            capacity=100, notification_email='dash@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=100000, quantity=50,
        )
        self.client = APIClient()
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _dashboard(self):
        response = self.client.get('/api/organizer/dashboard/')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data['referrals']

    def _order(self, code, quantity=1, total=100000, status='COMPLETED'):
        order = Order.objects.create(
            event=self.event, guest_email='buyer@example.com', guest_name='Buyer',
            subtotal=total, total_amount=total, status=status, referral_code=code,
        )
        OrderItem.objects.create(
            order=order, ticket_type=self.ticket_type,
            quantity=quantity, unit_price=100000,
            line_total=100000 * quantity,
        )
        return order

    # ── Codes are listed before they sell ────────────────────────────────────
    def test_a_new_code_is_listed_with_zero_sales(self):
        Referral.objects.create(event=self.event, name='Idowu', code='IDOWU')

        rows = self._dashboard()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['referral_code'], 'IDOWU')
        self.assertEqual(rows[0]['referral_name'], 'Idowu')
        self.assertEqual(rows[0]['event_title'], 'Dash Event')
        self.assertEqual(rows[0]['sales'], 0)
        self.assertEqual(rows[0]['tickets'], 0)
        self.assertEqual(rows[0]['revenue'], 0)

    # ── Sales are attributed ─────────────────────────────────────────────────
    def test_sales_and_tickets_are_attributed_to_their_code(self):
        Referral.objects.create(event=self.event, name='Sarah', code='SARAH25')
        self._order('SARAH25', quantity=2, total=200000)
        self._order('SARAH25', quantity=1, total=100000)
        self._order('')  # no referral

        rows = self._dashboard()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['sales'], 2)
        self.assertEqual(rows[0]['tickets'], 3)
        self.assertEqual(rows[0]['revenue'], 300000)

    def test_pending_orders_do_not_count(self):
        Referral.objects.create(event=self.event, name='Pending', code='PEND')
        self._order('PEND', status='PENDING')

        rows = self._dashboard()

        self.assertEqual(rows[0]['sales'], 0)

    def test_codes_with_sales_are_ordered_first(self):
        Referral.objects.create(event=self.event, name='Quiet', code='AAA')
        Referral.objects.create(event=self.event, name='Busy', code='ZZZ')
        self._order('ZZZ')

        rows = self._dashboard()

        self.assertEqual([r['referral_code'] for r in rows], ['ZZZ', 'AAA'])

    # ── Codes that only exist on orders ──────────────────────────────────────
    def test_a_code_found_only_on_orders_is_still_shown(self):
        self._order('TYPOED', quantity=1, total=100000)

        rows = self._dashboard()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['referral_code'], 'TYPOED')
        self.assertEqual(rows[0]['sales'], 1)
        self.assertFalse(rows[0]['is_active'])

    def test_matching_is_case_insensitive_and_not_duplicated(self):
        Referral.objects.create(event=self.event, name='Sarah', code='SARAH25')
        self._order('sarah25')

        rows = self._dashboard()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['sales'], 1)

    # ── Scoping ──────────────────────────────────────────────────────────────
    def test_other_organizers_referrals_are_not_shown(self):
        other_user = User.objects.create_user(
            username='otherdash', email='other@example.com',
            password='password', role='ORGANIZER',
        )
        other_org, _ = OrganizerProfile.objects.get_or_create(
            user=other_user, defaults={'company_name': 'Other Org'},
        )
        other_event = Event.objects.create(
            organizer=other_org, title='Other Event', slug='other-event',
            capacity=10, notification_email='other@example.com',
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        Referral.objects.create(event=other_event, name='Theirs', code='THEIRS')
        Referral.objects.create(event=self.event, name='Mine', code='MINE')

        rows = self._dashboard()

        self.assertEqual([r['referral_code'] for r in rows], ['MINE'])
