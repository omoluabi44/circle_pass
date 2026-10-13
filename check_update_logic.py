import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import SupportTicket
ticket = SupportTicket.objects.get(id=2)

print("Old Status:", ticket.status)
# DRF Serializer Update simulation
ticket.status = 'IN_PROGRESS'
ticket.save()
print("New Status saved to DB:", ticket.status)
