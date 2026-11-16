"""Admin user list must expose a contact number for phone-based follow-up."""
from django.test import TestCase

from api.views_admin import AdminUserSerializer
from core.models import AttendeeProfile, OrganizerProfile, User


class AdminUserContactTests(TestCase):
    def test_organizer_phone_and_name_are_exposed(self):
        user = User.objects.create_user(
            username='contactorg', email='contactorg@example.com',
            password='password', role='ORGANIZER',
            first_name='Ada', last_name='Okafor',
        )
        # A post_save signal already creates the profile, so update in place.
        profile, _ = OrganizerProfile.objects.get_or_create(
            user=user, defaults={'company_name': 'Ada Events'},
        )
        profile.company_name = 'Ada Events'
        profile.phone_number = '08012345678'
        profile.save(update_fields=['company_name', 'phone_number'])

        # Admin lists read users fresh from the database, so reload to avoid
        # the profile copy cached on this in-memory user by the signal.
        data = AdminUserSerializer(User.objects.get(pk=user.pk)).data

        self.assertEqual(data['phone_number'], '08012345678')
        self.assertEqual(data['full_name'], 'Ada Okafor')

    def test_attendee_phone_falls_back_to_attendee_profile(self):
        user = User.objects.create_user(
            username='contactattendee', email='contactattendee@example.com',
            password='password', role='ATTENDEE',
        )
        AttendeeProfile.objects.create(user=user, phone_number='08099998888')

        data = AdminUserSerializer(User.objects.get(pk=user.pk)).data

        self.assertEqual(data['phone_number'], '08099998888')

    def test_missing_phone_is_blank_not_null(self):
        user = User.objects.create_user(
            username='nophone', email='nophone@example.com',
            password='password', role='ATTENDEE',
        )

        data = AdminUserSerializer(User.objects.get(pk=user.pk)).data

        self.assertEqual(data['phone_number'], '')
