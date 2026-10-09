import os
import sys

# Ensure django is configured
import django

# Add backend dir to path if needed (we will run this from backend dir via manage.py shell)

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

templates = [
    'email/account_created.html',
    'email/bank_account_added.html',
    'email/custom_activation.html',
    'email/event_announcement.html',
    'email/event_reminder.html',
    'email/order_receipt.html',
    'email/password_reset.html'
]

context = {
    'first_name': 'Emmanuel',
    'user': {'first_name': 'Emmanuel'},
    'frontend_url': 'https://thecirclepass.com',
    'bank_name': 'Test Bank',
    'account_number': '1234567890',
    'uid': '123',
    'token': 'abc',
    'event_title': 'Test Event',
    'announcement_content': 'This is a test announcement.',
    'event_time': 'Oct 10, 2026',
    'event_location': 'Lagos',
    'order_id': 'ORD-1234',
    'total_amount': '?5,000',
    'tickets': [{'tier_name': 'VIP', 'quantity': 2, 'price': 2500}],
    'order_total': '5000',
    'event_name': 'Test Event'
}

recipient = "emmanuelogunleye441999@gmail.com"

for template in templates:
    try:
        html_content = render_to_string(template, context)
        text_content = strip_tags(html_content)
        subject = f"CirclePass Test: {template}"
        
        msg = EmailMultiAlternatives(
            subject,
            text_content,
            'officialcirclepass@thecirclepass.com',
            [recipient]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Sent {template} successfully.")
    except Exception as e:
        print(f"Failed to send {template}: {str(e)}")
