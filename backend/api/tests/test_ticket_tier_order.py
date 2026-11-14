"""
Organisers can reorder ticket tiers with the up/down arrows in the event form.

The order of the submitted `ticket_types` array is the display order on the
public event page, and it is persisted as `sort_order`.
"""
from django.test import TestCase
from django.utils import timezone

from api.serializers import EventCreateUpdateSerializer
from core.models import Event, OrganizerProfile, TicketType, User


class TicketTierOrderTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(
            username='orderorg', email='orderorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=user, defaults={'company_name': 'Order Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Tier Order Event',
            slug='tier-order-event', capacity=300,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(days=1),
            status='PUBLISHED',
        )
        self.vip = TicketType.objects.create(
            event=self.event, tier='VIP', name='VIP', price=500000,
            quantity=20, sort_order=0,
        )
        self.regular = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=200000,
            quantity=50, sort_order=1,
        )
        self.early = TicketType.objects.create(
            event=self.event, tier='EARLY_BIRD', name='Earlybird', price=100000,
            quantity=100, sort_order=2,
        )

    def _payload(self, order):
        tiers = {
            'VIP': self.vip,
            'Regular': self.regular,
            'Earlybird': self.early,
        }
        return [
            {
                'id': tiers[name].id,
                'tier': tiers[name].tier,
                'name': tiers[name].name,
                'price': tiers[name].price,
                'quantity': tiers[name].quantity,
                'is_active': True,
                'sort_order': idx,
            }
            for idx, name in enumerate(order)
        ]

    def test_new_order_is_persisted(self):
        serializer = EventCreateUpdateSerializer(
            self.event,
            data={'ticket_types': self._payload(['Earlybird', 'VIP', 'Regular'])},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        ordered = list(
            self.event.ticket_types.order_by('sort_order')
            .values_list('name', flat=True)
        )
        self.assertEqual(ordered, ['Earlybird', 'VIP', 'Regular'])

    def test_api_returns_tiers_in_saved_order(self):
        serializer = EventCreateUpdateSerializer(
            self.event,
            data={'ticket_types': self._payload(['Regular', 'Earlybird', 'VIP'])},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Event detail payload renders ticket_types in meta order.
        from api.serializers import EventSerializer

        data = EventSerializer(self.event).data
        names = [t['name'] for t in data['ticket_types']]
        self.assertEqual(names, ['Regular', 'Earlybird', 'VIP'])

    def test_order_can_be_reversed_again(self):
        for order in (['Regular', 'VIP', 'Earlybird'], ['VIP', 'Regular', 'Earlybird']):
            serializer = EventCreateUpdateSerializer(
                self.event,
                data={'ticket_types': self._payload(order)},
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            names = list(
                self.event.ticket_types.order_by('sort_order')
                .values_list('name', flat=True)
            )
            self.assertEqual(names, order)

    def test_tiers_keep_sequential_sort_order(self):
        serializer = EventCreateUpdateSerializer(
            self.event,
            data={'ticket_types': self._payload(['Earlybird', 'Regular', 'VIP'])},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        sort_orders = sorted(
            self.event.ticket_types.values_list('sort_order', flat=True)
        )
        self.assertEqual(sort_orders, [0, 1, 2])
