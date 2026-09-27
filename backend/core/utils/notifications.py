import logging
from django.core.mail import send_mail
from django.conf import settings
from core.models import EmailLog

logger = logging.getLogger(__name__)

def _send_and_log_email(subject, message, recipient_list, from_email=None):
    if from_email is None:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com')
        
    for recipient in recipient_list:
        try:
            send_mail(
                subject,
                message,
                from_email,
                [recipient],
                fail_silently=False,
            )
            EmailLog.objects.create(
                recipient=recipient,
                subject=subject,
                status='Sent'
            )
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            EmailLog.objects.create(
                recipient=recipient,
                subject=subject,
                status='Failed'
            )

def send_purchase_receipt(order, tickets):
    """
    Sends a purchase receipt and digital tickets to the attendee.
    """
    if not tickets:
        return

    recipient = order.guest_email or (order.attendee.user.email if order.attendee else None)
    if not recipient:
        return

    subject = f"Your Tickets for {order.event.title}"
    
    # In production, use HTML templates and render_to_string
    message = f"Hello {order.guest_name or (order.attendee.user.get_full_name() if order.attendee else 'Guest')},\n\n"
    message += f"Thank you for your order! Here are your tickets for {order.event.title}:\n\n"
    
    for ticket in tickets:
        message += f"- {ticket.ticket_type.name} (Token: {ticket.qr_token})\n"
        
    message += "\nView your QR codes and full order details in your dashboard."
    
    _send_and_log_email(subject, message, [recipient])

def send_event_status_update(event):
    """
    Notifies an organizer that their event has been approved or rejected.
    """
    recipient = event.organizer.user.email
    subject = f"Event Status Update: {event.title}"
    
    message = f"Hello {event.organizer.company_name},\n\n"
    message += f"The status of your event '{event.title}' has been updated to: {event.get_status_display()}.\n"
    
    if event.status == 'CHANGES_REQUIRED':
        message += "Please log in to your dashboard to make the necessary changes.\n"
    
    _send_and_log_email(subject, message, [recipient])

def send_organizer_verification_update(organizer_verification):
    """
    Notifies an organizer of their verification status update.
    """
    recipient = organizer_verification.organizer.user.email
    subject = "CirclePass Verification Update"
    
    message = f"Hello {organizer_verification.organizer.company_name},\n\n"
    message += f"Your verification request status has been updated to: {organizer_verification.status}.\n"
    
    _send_and_log_email(subject, message, [recipient])
