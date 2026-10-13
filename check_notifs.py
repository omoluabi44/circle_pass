import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import Notification
for n in Notification.objects.filter(type='SYSTEM').order_by('-created_at')[:5]:
    print(n.title, "-", n.message, "-", n.user.email)
