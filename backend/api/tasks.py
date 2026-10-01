from celery import shared_task
from django.core.mail import send_mail
from core.models import Order
from django.conf import settings

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
        
        if time_period == '1hr':
            message = "Hi! We noticed you left some tickets in your cart. Complete your purchase before they sell out!"
        elif time_period == '24hr':
            message = "Hi again! Your tickets for {} are still waiting. Don't miss out on this event!".format(order.event.title)
        else: # 7days
            message = "Last chance! This is your final reminder to complete your ticket purchase for {}.".format(order.event.title)
            
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email if order.user else order.guest_email],
            fail_silently=False,
        )
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
            message = (
                f"Congratulations! Your event '{event.title}' has officially sold out all tickets.\n\n"
                f"Consider increasing your venue capacity or enabling the Waitlist feature "
                f"so interested attendees can still sign up.\n\n"
                f"Log in to your CirclePass dashboard to manage your event."
            )
            organizer_email = event.organizer.user.email
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [organizer_email],
                fail_silently=True,
            )
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
        message = (
            f"Good news!\n\n"
            f"You joined the waitlist for '{event.title}', and tickets are finally on sale.\n\n"
            f"Hurry up and secure your spot before they sell out!\n"
            f"As a special thank you for waiting, use the promo code PRESALE at checkout for a discount!\n\n"
            f"Get tickets here: {event_url}\n\n"
            f"See you there!"
        )
        
        emails = [entry.email for entry in entries]
        
        # Send mass email (in reality, loop or mass_mail)
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            emails, # BCC or loop for privacy
            fail_silently=True,
        )
        
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
        
        message = f"""Hello {first_name},

Thank you for purchasing your ticket with CirclePass. Your ticket has been successfully confirmed.

Your Ticket Details

Name: {name}
Email: {email_addr}
Order Number: {order_number}

Your QR Code

Your ticket QR code will be activated 3 hours before the exact start time of the event.

Once your QR code is activated, it will be sent directly to this email address. Please check your inbox when it is within 3 hours of the event time to access your active QR code.

You can also access your ticket anytime through your CirclePass Attendee Dashboard by signing in with the email address you used to purchase your ticket:

https://localhost:3000/dashboard/tickets

Please keep this email for your records and ensure you have access to the email address used for your ticket purchase.

We look forward to having you at the event.

Warm regards,
The CirclePass Team"""
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email_addr],
            fail_silently=False,
        )
        return f"Order confirmation sent to {email_addr}"
    except Exception as e:
        return str(e)

@shared_task
def send_event_announcement_email(announcement_id):
    from core.models import EventAnnouncement, Order
    try:
        announcement = EventAnnouncement.objects.get(id=announcement_id)
        event = announcement.event
        
        # Get all completed orders for this event
        orders = Order.objects.filter(event=event, status='COMPLETED')
        
        # Collect unique emails
        emails = set()
        for order in orders:
            if order.guest_email:
                emails.add(order.guest_email)
            elif order.attendee and order.attendee.user.email:
                emails.add(order.attendee.user.email)
                
        if not emails:
            return "No attendees to notify."
            
        subject = f"Announcement: {announcement.title} - {event.title}"
        message = (
            f"Hello,\n\n"
            f"The organizer of '{event.title}' has posted a new announcement:\n\n"
            f"{announcement.title}\n"
            f"{'-'*40}\n"
            f"{announcement.message}\n\n"
            f"Best regards,\n"
            f"CirclePass on behalf of {event.organizer.company_name}"
        )
        
        from django.core.mail import send_mass_mail
        from django.conf import settings
        
        messages = [
            (subject, message, settings.DEFAULT_FROM_EMAIL, [email])
            for email in emails
        ]
        
        send_mass_mail(messages, fail_silently=True)
        return f"Announcement {announcement_id} sent to {len(emails)} attendees."
    except Exception as e:
        import traceback
        return str(traceback.format_exc())
