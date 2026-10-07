import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "circlepass_backend.settings")
django.setup()

from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings

context = {
    "attendee_name": "Jubril",
    "organizer_name": "The Culture Collective",
    "announcement_message": (
        "We wanted to share an important update about our upcoming event.\n\n"
        "The event date has been confirmed and we are excited to welcome you. "
        "All registered attendees will receive a detailed event guide closer to the date.\n\n"
        "Thank you for your continued support. We look forward to seeing you soon!"
    ),
    "event_slug": "the-afterglow",
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/event_announcement.html", context)

send_mail(
    "Announcement: Event Update - The Afterglow",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Announcement Email sent successfully!")
