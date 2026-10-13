import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import SupportTicket
for t in SupportTicket.objects.all()[:5]:
    print(t.id, t.issue_type, t.status, t.user.email)
