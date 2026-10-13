import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import SupportTicket, Notification
ticket = SupportTicket.objects.first()
if ticket:
    print(f"Ticket ID: {ticket.id}, Current Status: {ticket.status}")
    # Change status directly to test notification
    old_status = ticket.status
    ticket.status = 'IN_PROGRESS'
    ticket.save()
    
    if old_status != ticket.status:
        print("Status changed!")
        Notification.objects.create(
            user=ticket.user,
            type='SYSTEM',
            title=f"Support Ticket Update",
            message=f"Ticket is now IN_PROGRESS"
        )
    print("Done")
else:
    print("No ticket found")
