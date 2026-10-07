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
    "first_name": "Jubril",
    "reset_url": "https://thecirclepass.com/reset-password/MQ/abc123token",
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/password_reset.html", context)

send_mail(
    "Reset your Circlepass password",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Password Reset Email sent successfully!")
