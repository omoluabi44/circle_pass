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
