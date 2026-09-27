import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import User, Ticket, Order, TicketType, Event, AttendeeProfile
import uuid

u = User.objects.get(email='emmanuelogunleye441999@gmail.com')
attendee = AttendeeProfile.objects.filter(user=u).first()

if not attendee:
    print("No attendee")
else:
    tickets = Ticket.objects.filter(order__attendee=attendee)
    print("Emmanuel has tickets:", tickets.count())
    for t in tickets:
        print("Ticket ID:", t.id, "QR:", t.qr_token)
