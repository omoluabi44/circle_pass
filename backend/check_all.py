import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import Ticket, Order, User

print("=== ALL USERS ===")
for u in User.objects.all():
    print(f"  User #{u.id} | email={u.email}")

print("\n=== ALL ORDERS ===")
for o in Order.objects.all():
    attendee_email = o.attendee.user.email if o.attendee else o.guest_email
    print(f"  Order #{o.id} | event={o.event.title} | user={attendee_email} | status={o.status}")

print("\n=== ALL TICKETS ===")
for t in Ticket.objects.all():
    user_email = t.order.attendee.user.email if t.order.attendee else t.order.guest_email
    print(f"  Ticket #{t.id} | order=#{t.order.id} | user={user_email} | status={t.status} | qr={t.qr_token[:20]}")
