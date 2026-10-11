from django.core.management.base import BaseCommand
from core.models import OrganizerProfile
from api.tasks import send_organizer_weekly_summary

class Command(BaseCommand):
    help = 'Send weekly summary email digest to organizers who have weekly_summary enabled.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organizer-id',
            type=int,
            help='Send only to a specific organizer ID',
        )
        parser.add_argument(
            '--test-email',
            type=str,
            help='Send test summary to a specific email address',
        )

    def handle(self, *args, **options):
        organizer_id = options.get('organizer_id')
        test_email = options.get('test_email')

        if organizer_id:
            try:
                org = OrganizerProfile.objects.get(id=organizer_id)
                self.stdout.write(f"Sending weekly summary for organizer {org.company_name}...")
                res = send_organizer_weekly_summary(org.id, test_recipient=test_email)
                self.stdout.write(self.style.SUCCESS(f"Result: {res}"))
            except OrganizerProfile.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Organizer with ID {organizer_id} not found."))
            return

        if test_email:
            org = OrganizerProfile.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organizer found in database to generate test summary."))
                return
            self.stdout.write(f"Sending test weekly summary using organizer {org.company_name} to {test_email}...")
            res = send_organizer_weekly_summary(org.id, test_recipient=test_email)
            self.stdout.write(self.style.SUCCESS(f"Result: {res}"))
            return

        organizers = OrganizerProfile.objects.filter(weekly_summary=True)
        self.stdout.write(f"Found {organizers.count()} organizers with weekly_summary enabled.")

        count = 0
        for org in organizers:
            res = send_organizer_weekly_summary(org.id)
            self.stdout.write(f"Organizer #{org.id} ({org.company_name}): {res}")
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Finished sending weekly summaries to {count} organizers."))
