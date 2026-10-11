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
    
    name = order.guest_name or (order.attendee.user.get_full_name() if order.attendee else 'Guest')
    first_name = name.split(' ')[0] if name else 'There'
    order_number = f"CP-{str(order.id).zfill(8)}"
    
    from django.template.loader import render_to_string
    
    frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'https://thecirclepass.com'
    
    # Give guests the public link to their first ticket; registered users get dashboard link
    is_guest = not order.attendee
    if is_guest and tickets:
        ticket_link = f"{frontend_url}/t/{tickets[0].qr_token}"
    else:
        ticket_link = f"{frontend_url}/dashboard/tickets"
        
    signup_link = f"{frontend_url}/register?email={recipient}"

    event = order.event

    # Format location string
    if getattr(event, 'is_online', False):
        event_location = "Online Event"
    elif getattr(event, 'venue', None) and event.venue.name:
        if getattr(event, 'city', None):
            event_location = f"{event.venue.name}, {event.city}"
        else:
            event_location = event.venue.name
    elif getattr(event, 'location_name', None):
        if getattr(event, 'city', None):
            event_location = f"{event.location_name}, {event.city}"
        else:
            event_location = event.location_name
    elif getattr(event, 'city', None):
        if getattr(event, 'country', None):
            event_location = f"{event.city}, {event.country}"
        else:
            event_location = event.city
    else:
        event_location = "Location TBA"

    cover_image_url = getattr(event, 'cover_image', None)
    if cover_image_url and not str(cover_image_url).startswith(('http://', 'https://')):
        base_api = getattr(settings, 'API_BASE_URL', 'https://api.thecirclepass.com')
        if not str(cover_image_url).startswith('/'):
            cover_image_url = f"{base_api}/media/{cover_image_url}"
        else:
            cover_image_url = f"{base_api}{cover_image_url}"

    context = {
        'first_name': first_name,
        'name': name,
        'email': recipient,
        'order_number': order_number,
        'ticket_link': ticket_link,
        'is_guest': is_guest,
        'signup_link': signup_link,
        'event': event,
        'event_location': event_location,
        'cover_image_url': cover_image_url,
        'tickets': tickets,
        'frontend_url': frontend_url,
    }
    
    message = f"""Hello {first_name},

Thank you for purchasing your ticket with CirclePass. Your ticket has been successfully confirmed.

Your Ticket Details
Name: {name}
Email: {recipient}
Order Number: {order_number}

You can view and download your digital ticket QR code anytime by clicking the link below:
{ticket_link}

The CirclePass Team"""
    
    try:
        html_message = render_to_string('email/order_receipt.html', context)
        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')

def send_organizer_sales_notification(order, tickets):
    """
    Notifies the organizer that tickets have been purchased for their event,
    respecting their sales_notifications preference.
    """
    organizer = getattr(order.event, 'organizer', None)
    if not organizer:
        return

    # Check notification preference (default True)
    if not getattr(organizer, 'sales_notifications', True):
        logger.info(f"Skipping sales notification for organizer {organizer.id}: sales_notifications is disabled.")
        return

    recipient = organizer.contact_email or (organizer.user.email if organizer.user else None)
    if not recipient:
        return

    event = order.event
    event_title = event.title
    total_qty = sum(item.quantity for item in order.items.all()) or len(tickets)
    gross_amount_formatted = f"₦{order.total_amount:,.2f}" if order.total_amount > 0 else "Free (₦0)"
    buyer_name = order.guest_name or (order.attendee.user.get_full_name() if order.attendee else 'A guest attendee')
    buyer_email = order.guest_email or (order.attendee.user.email if order.attendee else '')
    order_number = f"CP-{str(order.id).zfill(8)}"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
    dashboard_url = f"{frontend_url}/organizer/events/{event.id}/overview"

    subject = f"New Ticket Sale! {total_qty} ticket{'s' if total_qty != 1 else ''} sold for {event_title}"

    message = f"""Hello {organizer.company_name or 'Organizer'},

Great news! You have a new ticket sale for "{event_title}".

Order Details:
Order Number: {order_number}
Buyer: {buyer_name} ({buyer_email})
Tickets Sold: {total_qty}
Total Amount: {gross_amount_formatted}

You can view your real-time sales and attendee list in your Organizer Dashboard:
{dashboard_url}

Keep up the great work!
The CirclePass Team
"""

    html_message = f"""
    <div style="font-family: 'Roboto', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #6366f1; padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-family: 'Fredoka', Arial, sans-serif; font-size: 26px; font-weight: 700;">New Ticket Sale! 🎉</h1>
          <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">You just sold tickets for <strong>{event_title}</strong></p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>{organizer.company_name or 'Organizer'}</strong>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">A new order was just confirmed on CirclePass. Here is a quick summary:</p>
          
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Order ID:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #111827;">{order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Attendee:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #111827;">{buyer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Tickets:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #111827;">{total_qty}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Total Amount:</td>
                <td style="padding: 8px 0; font-weight: 700; text-align: right; color: #4f46e5; border-top: 1px solid #e5e7eb; font-size: 16px;">{gross_amount_formatted}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="{dashboard_url}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px;">View Event Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0;">You received this because Sales Notifications are enabled in your CirclePass organizer settings.</p>
        </div>
      </div>
    </div>
    """

    try:
        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send organizer sales notification to {recipient}: {e}")
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')

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

def send_bank_account_added_email(bank_account):
    """
    Notifies an organizer that a new bank account was added to their profile.
    """
    user = bank_account.organizer.user
    recipient = user.email
    subject = "Your bank account has been added"
    
    frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'https://thecirclepass.com'
    
    first_name = user.first_name or user.username or 'There'
    
    # Mask account number: e.g. "•••• 4821"
    acc_num = bank_account.account_number
    masked_account = f"•••• {acc_num[-4:]}" if len(acc_num) >= 4 else f"•••• {acc_num}"
    
    context = {
        'first_name': first_name,
        'bank_name': bank_account.bank_name,
        'masked_account_number': masked_account,
        'frontend_url': frontend_url,
    }
    
    from django.template.loader import render_to_string
    html_message = render_to_string('email/bank_account_added.html', context)
    
    message = f"Hi {first_name},\n\nGreat news! You've successfully added a new bank account ({bank_account.bank_name}, {masked_account}) to your Circlepass profile."
    
    try:
        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')

def send_event_reminder_email(order):
    """
    Sends a friendly reminder to an attendee about their upcoming event.
    """
    recipient = order.guest_email or (order.attendee.user.email if order.attendee else None)
    if not recipient:
        return

    subject = f"Reminder: Your upcoming event '{order.event.title}'"
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
    
    name = order.guest_name or (order.attendee.user.get_full_name() if order.attendee else 'There')
    first_name = name.split(' ')[0] if name else 'There'
    
    context = {
        'first_name': first_name,
        'event': order.event,
        'frontend_url': frontend_url,
    }
    
    from django.template.loader import render_to_string
    html_message = render_to_string('email/event_reminder.html', context)
    
    message = f"Hi {first_name},\n\nThis is a friendly reminder about your upcoming event, {order.event.title}. We're excited to see you there!"
    
    try:
        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send reminder email to {recipient}: {e}")
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')


def send_waitlist_organizer_notification(entry):
    """
    Notifies the organizer whenever a new waitlist request is submitted.
    """
    try:
        organizer = entry.event.organizer
        recipient = organizer.user.email if organizer and organizer.user else None
        if not recipient:
            return

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        manage_url = f"{frontend_url}/organizer/events/{entry.event.id}/waitlist"

        subject = f"New Waitlist Request - {entry.event.title}"
        organizer_name = organizer.company_name or organizer.user.get_full_name() or 'Organizer'
        tier_name = entry.ticket_type.name if entry.ticket_type else 'General Admission'

        context = {
            'organizer_name': organizer_name,
            'event': entry.event,
            'attendee_name': entry.name or 'Attendee',
            'attendee_email': entry.email,
            'attendee_phone': entry.phone,
            'tier_name': tier_name,
            'quantity': entry.quantity,
            'frontend_url': frontend_url,
            'manage_url': manage_url,
        }

        from django.template.loader import render_to_string
        html_message = render_to_string('email/waitlist_new_request.html', context)
        message = (
            f"Hi {organizer_name},\n\n"
            f"A new attendee ({entry.name or 'Attendee'}, {entry.email}) has joined the waitlist for '{entry.event.title}' "
            f"requesting {entry.quantity}x {tier_name}.\n\n"
            f"Manage waitlist applications here: {manage_url}\n\n"
            f"CirclePass Team"
        )

        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send waitlist organizer notification: {e}")
        if recipient:
            EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')


def send_waitlist_accepted_notification(entry):
    """
    Notifies an attendee that their waitlist request was approved and tickets are reserved.
    """
    try:
        recipient = entry.email
        if not recipient:
            return

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        event_slug = getattr(entry.event, 'slug', entry.event.id)
        checkout_url = f"{frontend_url}/events/{event_slug}/checkout?waitlist_token={entry.access_token}"

        subject = f"Your Waitlist Request Was Accepted! - {entry.event.title}"
        attendee_name = entry.name or 'There'
        tier_name = entry.ticket_type.name if entry.ticket_type else 'General Admission'

        # Format price
        unit_price = entry.ticket_type.price if entry.ticket_type else 0
        total_kobo = unit_price * entry.quantity
        if total_kobo == 0:
            formatted_price = "Free (₦0)"
        else:
            formatted_price = f"₦{(total_kobo / 100):,.2f}"

        # Format expiration
        expires_at_formatted = entry.reserved_until.strftime('%A, %b %d, %Y at %I:%M %p') if entry.reserved_until else 'Within 2 hours'

        context = {
            'attendee_name': attendee_name,
            'event': entry.event,
            'tier_name': tier_name,
            'quantity': entry.quantity,
            'formatted_price': formatted_price,
            'expires_at_formatted': expires_at_formatted,
            'checkout_url': checkout_url,
            'frontend_url': frontend_url,
        }

        from django.template.loader import render_to_string
        html_message = render_to_string('email/waitlist_accepted.html', context)
        message = (
            f"Hi {attendee_name},\n\n"
            f"Great news! Your waitlist request for {entry.event.title} has been accepted!\n"
            f"Reserved: {entry.quantity}x {tier_name}\n"
            f"Total: {formatted_price}\n"
            f"Reserved Until: {expires_at_formatted}\n\n"
            f"Complete your payment now before your reservation expires: {checkout_url}\n\n"
            f"CirclePass Team"
        )

        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@circlepass.com'),
            [recipient],
            html_message=html_message,
            fail_silently=False,
        )
        EmailLog.objects.create(recipient=recipient, subject=subject, status='Sent')
    except Exception as e:
        logger.error(f"Failed to send waitlist accepted notification: {e}")
        if recipient:
            EmailLog.objects.create(recipient=recipient, subject=subject, status='Failed')
