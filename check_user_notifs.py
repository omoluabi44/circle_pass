import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import Notification, User
user = User.objects.get(email="olamilekanrite@gmail.com")
print(f"Notifications for {user.email}:")
for n in Notification.objects.filter(user=user):
    print(n.title, "-", n.message)
