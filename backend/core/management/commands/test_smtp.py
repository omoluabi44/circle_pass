from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import traceback

class Command(BaseCommand):
    help = 'Test SMTP email delivery and print configuration details'

    def add_arguments(self, parser):
        parser.add_argument('--recipient', type=str, required=True, help='Recipient email address')

    def handle(self, *args, **options):
        recipient = options['recipient'].strip()
        self.stdout.write("--- Current SMTP Settings ---")
        self.stdout.write(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        has_pwd = bool(settings.EMAIL_HOST_PASSWORD)
        self.stdout.write(f"EMAIL_HOST_PASSWORD configured: {'Yes' if has_pwd else 'NO (EMPTY!)'}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write("-----------------------------")

        if not has_pwd:
            self.stderr.write(self.style.ERROR(
                "ERROR: EMAIL_HOST_PASSWORD / SENDGRID_API_KEY is not set in backend/.env!"
            ))

        self.stdout.write(f"Attempting to send test email to {recipient}...")
        try:
            send_mail(
                subject="CirclePass SMTP Test Email",
                message="This is a test email from CirclePass verifying your email configuration is working.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f"SUCCESS: Email delivered to {recipient}!"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"FAILED to send email: {e}"))
            traceback.print_exc()
