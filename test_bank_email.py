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
    "bank_name": "GTBank",
    "masked_account_number": "•••• 4821",
    "frontend_url": "https://thecirclepass.com",
}

html_message = render_to_string("email/bank_account_added.html", context)

send_mail(
    "Your bank account has been added",
    "Please view in HTML.",
    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@circlepass.com"),
    ["emmanuelOgunleye441999@gmail.com"],
    html_message=html_message,
    fail_silently=False,
)
print("Bank Account Added Email sent successfully!")
