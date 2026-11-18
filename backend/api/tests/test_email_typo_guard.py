"""A mistyped domain must never send a ticket into the void.

Order 431 went to ``papkastella565@gmail.con``: the buyer paid, the ticket was
issued, and the mail bounced. ``.con`` is not a TLD, so it is corrected before
the address is stored — while real domains (``.co``, ``.cm``, ``.com.ng``) are
left exactly as typed.
"""
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from api.serializers import CheckoutRequestSerializer, UserCreateSerializer
from core.models import (
    Event, OrganizerProfile, TicketType, User, WaitlistEntry,
)
from core.utils.email_validation import email_suggestion, normalise_email


class EmailTypoUnitTests(TestCase):
    def test_con_is_corrected_to_com(self):
        self.assertEqual(
            email_suggestion('papkastella565@gmail.con'),
            'papkastella565@gmail.com',
        )

    def test_other_obvious_tld_slips_are_corrected(self):
        for typo in ('gmail.cim', 'gmail.comm', 'gmail.conm', 'gmail.cpm'):
            with self.subTest(domain=typo):
                self.assertEqual(
                    email_suggestion(f'buyer@{typo}'), 'buyer@gmail.com',
                )

    def test_misspelt_provider_domains_are_corrected(self):
        self.assertEqual(email_suggestion('buyer@gmial.com'), 'buyer@gmail.com')
        self.assertEqual(email_suggestion('buyer@yahoo.co'), 'buyer@yahoo.com')

    def test_real_domains_are_never_changed(self):
        for address in (
            'buyer@gmail.com',
            'buyer@company.co',
            'buyer@business.com.ng',
            'buyer@site.cm',          # Cameroon is a real TLD
            'buyer@startup.io',
            'buyer@yahoo.co.uk',
        ):
            with self.subTest(address=address):
                self.assertIsNone(email_suggestion(address))
                self.assertEqual(normalise_email(address), address)

    def test_local_part_is_left_alone(self):
        self.assertEqual(
            email_suggestion('PapKastella.565+news@gmail.con'),
            'papkastella.565+news@gmail.com',
        )

    def test_blank_and_malformed_are_not_touched(self):
        self.assertIsNone(email_suggestion(''))
        self.assertIsNone(email_suggestion('not-an-email'))
        self.assertIsNone(email_suggestion('trailing@con'))


class CheckoutEmailTypoTests(TestCase):
    def test_guest_email_is_corrected_at_checkout(self):
        serializer = CheckoutRequestSerializer(data={
            'event_id': 1,
            'items': [{'ticket_type_id': 1, 'quantity': 1}],
            'guest_email': 'papkastella565@gmail.con',
            'guest_name': 'Papa Kastella',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data['guest_email'], 'papkastella565@gmail.com',
        )

    def test_attendee_emails_are_corrected_at_checkout(self):
        serializer = CheckoutRequestSerializer(data={
            'event_id': 1,
            'items': [{'ticket_type_id': 1, 'quantity': 1}],
            'attendees': [
                {'ticket_type_id': 1, 'first_name': 'Ada', 'email': 'ada@yahoo.con'},
            ],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data['attendees'][0]['email'], 'ada@yahoo.com',
        )


class SignupEmailTypoTests(TestCase):
    def test_signup_stores_the_corrected_address(self):
        serializer = UserCreateSerializer(data={
            'username': 'typouser',
            'email': 'typouser@gmail.con',
            'password': 'Str0ngPassw0rd!2026',
            'role': 'ATTENDEE',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['email'], 'typouser@gmail.com')

    def test_an_address_already_taken_is_not_silently_reassigned(self):
        User.objects.create_user(
            username='owner', email='owner@gmail.com', password='password',
        )
        serializer = UserCreateSerializer(data={
            'username': 'second',
            'email': 'owner@gmail.con',
            'password': 'Str0ngPassw0rd!2026',
            'role': 'ATTENDEE',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        # Left as typed so the unique-email check can reject it rather than
        # handing one person another person's account.
        self.assertEqual(serializer.validated_data['email'], 'owner@gmail.con')


class EmailCheckEndpointTests(TestCase):
    def test_endpoint_reports_the_suggestion(self):
        response = APIClient().get(
            reverse('email_check'), {'email': 'buyer@gmail.con'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['suggestion'], 'buyer@gmail.com')
        self.assertTrue(response.data['corrected'])

    def test_endpoint_says_nothing_for_a_good_address(self):
        response = APIClient().get(
            reverse('email_check'), {'email': 'buyer@gmail.com'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['suggestion'])
        self.assertFalse(response.data['corrected'])


class WaitlistClosedAfterEventTests(TestCase):
    def setUp(self):
        org_user = User.objects.create_user(
            username='endedorg', email='endedorg@example.com',
            password='password', role='ORGANIZER',
        )
        self.organizer, _ = OrganizerProfile.objects.get_or_create(
            user=org_user, defaults={'company_name': 'Ended Org'},
        )
        self.event = Event.objects.create(
            organizer=self.organizer, title='Already Happened', slug='already-happened',
            capacity=10, notification_email='ended@example.com',
            waitlist_enabled=True,
            start_time=timezone.now() - timedelta(days=3),
            end_time=timezone.now() - timedelta(days=2),
            status='PUBLISHED',
        )
        self.ticket_type = TicketType.objects.create(
            event=self.event, tier='REGULAR', name='Regular',
            price=500000, quantity=10, quantity_sold=10,
        )

    def test_waitlist_join_is_rejected_for_an_ended_event(self):
        response = APIClient().post(
            reverse('event_waitlist', kwargs={'event_id': self.event.id}),
            {
                'name': 'Late Comer', 'email': 'late@gmail.com',
                'ticket_type_id': self.ticket_type.id, 'quantity': 1,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('ended', response.data['detail'].lower())
        self.assertFalse(WaitlistEntry.objects.filter(event=self.event).exists())

    def test_upcoming_sold_out_event_still_accepts_a_request(self):
        self.event.end_time = timezone.now() + timedelta(days=2)
        self.event.start_time = timezone.now() + timedelta(days=1)
        self.event.save(update_fields=['start_time', 'end_time'])

        response = APIClient().post(
            reverse('event_waitlist', kwargs={'event_id': self.event.id}),
            {
                'name': 'Early Bird', 'email': 'early@gmail.com',
                'ticket_type_id': self.ticket_type.id, 'quantity': 1,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(WaitlistEntry.objects.filter(event=self.event).exists())