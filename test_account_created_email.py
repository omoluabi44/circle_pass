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
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/account_created.html", context)

send_mail(
    "Your CirclePass account has been created",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Account Created Email sent successfully!")
