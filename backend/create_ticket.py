import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import User, Ticket, Order, TicketType, Event, AttendeeProfile

u = User.objects.get(email='admin2@example.com')
attendee, _ = AttendeeProfile.objects.get_or_create(user=u)

e = Event.objects.first()
tt = TicketType.objects.filter(event=e).first()

order = Order.objects.create(attendee=attendee, event=e, total_amount=0)
t = Ticket.objects.create(order=order, ticket_type=tt, qr_token='test-qr-1234')
print("Created ticket with qr_token:", t.qr_token)
