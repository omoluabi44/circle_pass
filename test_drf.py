import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from api.serializers import SupportTicketSerializer
from core.models import SupportTicket
from django.test import RequestFactory

ticket = SupportTicket.objects.first()
print("Initial DB Status:", ticket.status)

# Mock what DRF UpdateModelMixin does
instance = SupportTicket.objects.get(id=ticket.id)
serializer = SupportTicketSerializer(instance, data={'status': 'RESOLVED'}, partial=True)
serializer.is_valid(raise_exception=True)

# Inside perform_update
old_status = SupportTicket.objects.get(id=ticket.id).status  # This is what self.get_object() does
new_instance = serializer.save()

print("old_status:", old_status)
print("new_instance.status:", new_instance.status)
