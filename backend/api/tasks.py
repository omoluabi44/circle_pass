from celery import shared_task
from django.core.mail import EmailMultiAlternatives, get_connection
from core.models import Order
from django.conf import settings

def get_html_email(title, content):
    # content is already formatted HTML paragraphs or we can replace \n with <br>
    formatted_content = content.replace('\n', '<br>')
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #F9FAFB;
                margin: 0;
                padding: 40px 20px;
                color: #333333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}
            .header {{
                background-color: #6366f1;
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: 1px;
            }}
            .content {{
                padding: 40px 30px;
                line-height: 1.6;
                font-size: 16px;
                color: #1f2937;
            }}
            .footer {{
                background-color: #f3f4f6;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
            }}
            .button {{
                display: inline-block;
                padding: 12px 24px;
                background-color: #6366f1;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CirclePass</h1>
            </div>
            <div class="content">
                <h2 style="color: #111827; margin-top: 0; font-size: 22px;">{title}</h2>
                <div style="margin-top: 20px;">{formatted_content}</div>
            </div>
            <div class="footer">
                <p style="margin: 0;">&copy; 2026 CirclePass. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">Your Pass to the Next Experience</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_html_email(subject, text_content, to_emails, title_for_html=None):
    if title_for_html is None:
        title_for_html = subject
    html_content = get_html_email(title_for_html, text_content)
    
    msg = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        to_emails
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)

@shared_task
def send_abandoned_cart_email(order_id, time_period):
    """
    time_period can be '1hr', '24hr', or '7days'
    """
    try:
        order = Order.objects.get(id=order_id)
        # If the order is no longer PENDING, they either paid or cancelled, so do not send.
        if order.status != 'PENDING':
            return "Order not pending, skipped."
            
        subject = f"You left something behind for {order.event.title}!"
        title = "Don't Miss Out!"
        
        if time_period == '1hr':
            message = "Hi! We noticed you left some tickets in your cart. Complete your purchase before they sell out!"
        elif time_period == '24hr':
            message = "Hi again! Your tickets for {} are still waiting. Don't miss out on this event!".format(order.event.title)
        else: # 7days
            message = "Last chance! This is your final reminder to complete your ticket purchase for {}.".format(order.event.title)
            
        send_html_email(subject, message, [order.user.email if order.user else order.guest_email], title_for_html=title)
        return f"Sent {time_period} email for order {order_id}"
    except Order.DoesNotExist:
        return "Order does not exist."
    except Exception as e:
        return str(e)

@shared_task
def check_sold_out_and_notify(event_id):
    from core.models import Event
    try:
        event = Event.objects.get(id=event_id)
        # Check if all tickets are sold out
        total_capacity = sum(tt.quantity for tt in event.ticket_types.all())
        total_sold = sum(tt.quantity_sold for tt in event.ticket_types.all())
        
        if total_capacity > 0 and total_sold >= total_capacity:
            subject = f"Your event '{event.title}' is Sold Out!"
            title = "Congratulations! 🎉"
            message = (
                f"Your event '{event.title}' has officially sold out all tickets.\n\n"
                f"Consider increasing your venue capacity or enabling the Waitlist feature "
                f"so interested attendees can still sign up.\n\n"
                f"Log in to your CirclePass dashboard to manage your event."
            )
            organizer_email = event.organizer.user.email
            send_html_email(subject, message, [organizer_email], title_for_html=title)
            return f"Notified organizer for sold out event {event_id}"
        return "Not sold out yet."
    except Event.DoesNotExist:
        return "Event not found."
    except Exception as e:
        return str(e)

@shared_task
def notify_waitlist_on_launch(event_id):
    from core.models import Event, WaitlistEntry
    try:
        event = Event.objects.get(id=event_id)
        entries = WaitlistEntry.objects.filter(event=event, notified=False)
        
        if not entries.exists():
            return "No waitlist entries to notify."
        
        event_url = f"https://getcirclepass.com/events/{event.slug or event.id}"
        subject = f"Tickets are now LIVE for {event.title}!"
        title = "Tickets Are Available! 🎟️"
        message = (
            f"Good news!\n\n"
            f"You joined the waitlist for '{event.title}', and tickets are finally on sale.\n\n"
            f"Hurry up and secure your spot before they sell out!\n"
            f"As a special thank you for waiting, use the promo code PRESALE at checkout for a discount!\n\n"
            f"Get tickets here: <a href='{event_url}' style='color: #6366f1; font-weight: bold;'>{event_url}</a>\n\n"
            f"See you there!"
        )
        
        emails = [entry.email for entry in entries]
        
        # Send mass HTML email
        connection = get_connection()
        messages = []
        html_content = get_html_email(title, message)
        for email in emails:
            msg = EmailMultiAlternatives(subject, message, settings.DEFAULT_FROM_EMAIL, [email], connection=connection)
            msg.attach_alternative(html_content, "text/html")
            messages.append(msg)
            
        if messages:
            connection.send_messages(messages)
        
        # Mark as notified
        entries.update(notified=True)
        return f"Notified {len(emails)} waitlist members for event {event_id}"
    except Event.DoesNotExist:
        return "Event not found."
    except Exception as e:
        return str(e)

@shared_task
def send_order_confirmation_email(order_id):
    try:
        order = Order.objects.get(id=order_id)
        
        name = order.guest_name or (order.attendee.user.get_full_name() if order.attendee else 'Guest')
        email_addr = order.guest_email or (order.attendee.user.email if order.attendee else '')
        first_name = name.split(' ')[0] if name else 'There'
        order_number = f"CP-{str(order.id).zfill(8)}"
        
        subject = f"Your Ticket Confirmation - {order.event.title}"
        title = "Ticket Confirmed! ✅"
        
        message = f"""Hello {first_name},

Thank you for purchasing your ticket with CirclePass. Your ticket has been successfully confirmed.

<strong>Your Ticket Details</strong>
Name: {name}
Email: {email_addr}
Order Number: {order_number}

<strong>Your QR Code</strong>
Your ticket QR code will be activated 3 hours before the exact start time of the event.

Once your QR code is activated, it will be sent directly to this email address. Please check your inbox when it is within 3 hours of the event time to access your active QR code.

You can also access your ticket anytime through your CirclePass Attendee Dashboard by signing in with the email address you used to purchase your ticket:
<a href='https://getcirclepass.com/dashboard/tickets' style='color: #6366f1;'>View My Tickets</a>

Please keep this email for your records and ensure you have access to the email address used for your ticket purchase.

We look forward to having you at the event.

Warm regards,
The CirclePass Team"""
        
        send_html_email(subject, message, [email_addr], title_for_html=title)
        return f"Order confirmation sent to {email_addr}"
    except Exception as e:
        return str(e)

@shared_task
def send_event_announcement_email(announcement_id):
    from core.models import EventAnnouncement, Order
    from django.template.loader import render_to_string
    try:
        announcement = EventAnnouncement.objects.get(id=announcement_id)
        event = announcement.event
        organizer_name = event.organizer.company_name or 'The Organizer'
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')
        event_slug = getattr(event, 'slug', event.id)

        # Get all completed orders for this event
        orders = Order.objects.filter(event=event, status='COMPLETED').select_related(
            'attendee__user'
        )

        # Build per-recipient entries {email: name}
        recipients = {}
        for order in orders:
            if order.guest_email:
                name = (order.guest_name or 'Guest').split(' ')[0]
                recipients[order.guest_email] = name
            elif order.attendee and order.attendee.user.email:
                user = order.attendee.user
                name = (user.get_full_name() or user.username or 'Guest').split(' ')[0]
                recipients[user.email] = name

        if not recipients:
            return "No attendees to notify."

        subject = f"Announcement: {announcement.title} — {event.title}"

        connection = get_connection()
        messages = []

        for email_addr, first_name in recipients.items():
            context = {
                'attendee_name': first_name,
                'organizer_name': organizer_name,
                'announcement_message': announcement.message,
                'event_slug': event_slug,
                'frontend_url': frontend_url,
            }
            html_content = render_to_string('email/event_announcement.html', context)
            plain_text = (
                f"Hi {first_name},\n\n"
                f"An announcement from {organizer_name}:\n\n"
                f"{announcement.message}\n\n"
                f"Best regards,\nThe {organizer_name} Team"
            )
            msg = EmailMultiAlternatives(
                subject, plain_text, settings.DEFAULT_FROM_EMAIL, [email_addr],
                connection=connection
            )
            msg.attach_alternative(html_content, "text/html")
            messages.append(msg)

        if messages:
            connection.send_messages(messages)

        return f"Announcement {announcement_id} sent to {len(recipients)} attendees."
    except Exception as e:
        import traceback
        return str(traceback.format_exc())

