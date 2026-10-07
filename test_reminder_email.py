import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "circlepass_backend.settings")
django.setup()

from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class MockVenue:
    name = "Eko Convention Center"
    location = "Victoria Island, Lagos, Nigeria"

class MockEvent:
    id = 123
    title = "Tech Innovators Meetup 2025"
    start_date = timezone.now() + timedelta(days=230) # approx May 24, 2025
    end_date = timezone.now() + timedelta(days=230, hours=4)
    venue = MockVenue()
    state = "Lagos"
    country = "Nigeria"

context = {
    "first_name": "Jubril",
    "event": MockEvent(),
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/event_reminder.html", context)

send_mail(
    "Reminder: Your upcoming event",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Reminder Email sent successfully!")
