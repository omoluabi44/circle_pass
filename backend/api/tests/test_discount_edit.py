"""Editing a discount code after it has been created.

Organizers needed to fix a code, change its value or extend an expiry without
deleting it and losing the attendee history attached to it.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Discount, Event, OrganizerProfile, TicketType, User


class DiscountEditTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='editorg', email='editorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=self.user, defaults={'company_name': 'Edit Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Edit Event', slug='edit-event',
            capacity=100, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular', price=500000, quantity=100,
        )
        self.discount = Discount.objects.create(
            event=self.event, code='EARLY20', type='PERCENTAGE', value=20,
            usage_limit=30, ticket_type_ids=[],
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = f'/api/events/{self.event.id}/discounts/{self.discount.id}/'

    # ── Editing ─────────────────────────────────────────────────────────────
    def test_organizer_can_change_value_type_and_limits(self):
        response = self.client.patch(self.url, {
            'code': 'early20',
            'type': 'FIXED',
            'value': 150000,
            'usage_limit': 100,
            'ticket_type_ids': [self.ticket_type.id],
            'allow_multiple_per_user': False,
            'valid_until': '2027-01-31T23:59:00Z',
            'is_active': False,
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        discount = Discount.objects.get(pk=self.discount.pk)
        self.assertEqual(discount.code, 'EARLY20')  # normalised to uppercase
        self.assertEqual(discount.type, 'FIXED')
        self.assertEqual(discount.value, 150000)
        self.assertEqual(discount.usage_limit, 100)
        self.assertEqual(discount.ticket_type_ids, [self.ticket_type.id])
        self.assertFalse(discount.allow_multiple_per_user)
        self.assertFalse(discount.is_active)
        self.assertIsNotNone(discount.valid_until)

    def test_partial_patch_leaves_other_fields_alone(self):
        response = self.client.patch(self.url, {'value': 15}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        discount = Discount.objects.get(pk=self.discount.pk)
        self.assertEqual(discount.value, 15)
        self.assertEqual(discount.type, 'PERCENTAGE')
        self.assertEqual(discount.usage_limit, 30)
        self.assertEqual(discount.code, 'EARLY20')

    def test_clearing_the_expiry_removes_it(self):
        Discount.objects.filter(pk=self.discount.pk).update(
            valid_until=timezone.now() + timedelta(days=3),
        )

        response = self.client.patch(self.url, {'valid_until': None}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(Discount.objects.get(pk=self.discount.pk).valid_until)

    # ── Code rename guards ──────────────────────────────────────────────────
    def test_a_code_cannot_be_renamed_onto_another_code(self):
        Discount.objects.create(
            event=self.event, code='TAKEN', type='PERCENTAGE', value=10,
        )

        response = self.client.patch(self.url, {'code': 'taken'}, format='json')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).code, 'EARLY20')

    def test_an_empty_code_is_rejected(self):
        response = self.client.patch(self.url, {'code': '  '}, format='json')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).code, 'EARLY20')

    # ── Validation ──────────────────────────────────────────────────────────
    def test_percentage_above_95_is_rejected(self):
        response = self.client.patch(self.url, {'value': 96}, format='json')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).value, 20)

    def test_a_zero_or_negative_value_is_rejected(self):
        for payload in ({'value': 0}, {'value': -5}):
            with self.subTest(payload=payload):
                response = self.client.patch(self.url, payload, format='json')
                self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).value, 20)

    def test_ticket_classes_from_another_event_are_rejected(self):
        other_event = Event.objects.create(
            organizer=self.organizer, title='Other Event', slug='other-event',
            capacity=10, start_time=timezone.now(), end_time=timezone.now(),
            status='PUBLISHED',
        )
        foreign_type = TicketType.objects.create(
            event=other_event, tier='REGULAR', name='Foreign', price=0, quantity=10,
        )

        response = self.client.patch(
            self.url, {'ticket_type_ids': [foreign_type.id]}, format='json',
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).ticket_type_ids, [])

    # ── Access ──────────────────────────────────────────────────────────────
    def test_another_organizer_cannot_edit_the_code(self):
        stranger = User.objects.create_user(
            username='strangerorg', email='strangerorg@example.com',
            password='password', role='ORGANIZER',
        )
        OrganizerProfile.objects.get_or_create(
            user=stranger, defaults={'company_name': 'Stranger Org'},
        )
        client = APIClient()
        client.force_authenticate(user=stranger)

        response = client.patch(self.url, {'value': 90}, format='json')

        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(Discount.objects.get(pk=self.discount.pk).value, 20)

    def test_signed_out_requests_are_rejected(self):
        response = APIClient().patch(self.url, {'value': 90}, format='json')
        self.assertIn(response.status_code, (401, 403))
