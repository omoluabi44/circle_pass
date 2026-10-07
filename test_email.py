import os
import sys
import django

# Setup django environment
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "circlepass_backend.settings")
django.setup()

from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class MockTicketType:
    name = "ROCKSTAR - EARLY BIRD"
    def get_tier_display(self):
        return "Early Bird"

class MockTicket:
    ticket_type = MockTicketType()
    qr_token = "CP7F3D9B42"

class MockEvent:
    title = "The Afterglow"
    start_date = timezone.now() + timedelta(days=10)
    end_date = timezone.now() + timedelta(days=10, hours=5)
    location = "Lagos, Nigeria"
    cover_image = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"

context = {
    "first_name": "Jubril",
    "name": "Jubril Gawat",
    "email": "emmanuelOgunleye441999@gmail.com",
    "order_number": "CP-00000123",
    "ticket_link": "https://thecirclepass.com/dashboard/tickets",
    "is_guest": True,
    "signup_link": "https://thecirclepass.com/register?email=emmanuelOgunleye441999@gmail.com",
    "event": MockEvent(),
    "tickets": [MockTicket()],
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/order_receipt.html", context)

send_mail(
    "Test: Your ticket is confirmed",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Email sent successfully!")
