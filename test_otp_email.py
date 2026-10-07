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

context = {
    "code": "478782",
    "frontend_url": "https://thecirclepass.com",
    "user": type("User", (), {"username": "Emmanuel"})()
}

html_message = render_to_string("email/custom_activation.html", context)

send_mail(
    "Test: Your Circlepass Verification Code",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("OTP Email sent successfully!")
