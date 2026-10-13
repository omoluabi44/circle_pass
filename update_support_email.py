import re

with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """        if old_status != instance.status:
            from core.models import Notification
            status_display = dict(instance.STATUS_CHOICES).get(instance.status, instance.status)
            Notification.objects.create(
                user=instance.user,
                type='SYSTEM',
                title=f"Support Ticket Update: {status_display}",
                message=f"Your support ticket regarding '{instance.issue_type}' is now marked as {status_display}."
            )"""

new_code = """        if old_status != instance.status:
            from core.models import Notification
            status_display = dict(instance.STATUS_CHOICES).get(instance.status, instance.status)
            title = f"Support Ticket Update: {status_display}"
            message = f"Your support ticket regarding '{instance.issue_type}' is now marked as {status_display}."
            
            Notification.objects.create(
                user=instance.user,
                type='SYSTEM',
                title=title,
                message=message
            )
            
            # Send email to the organizer/user
            try:
                from .tasks import send_html_email
                from django.conf import settings
                send_html_email(
                    subject=title,
                    text_content=message,
                    to_emails=[instance.user.email],
                    title_for_html=title
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send support ticket email: {e}")"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('backend/api/views.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added email to views.py successfully")
else:
    print("Could not find old code for email in views.py")
