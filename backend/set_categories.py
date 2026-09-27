import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import EventCategory

print("Deleting old categories...")
EventCategory.objects.all().delete()

categories = [
    {"name": "Music", "slug": "music", "icon_name": "Music"},
    {"name": "Comedy", "slug": "comedy", "icon_name": "Mic"},
    {"name": "Sports", "slug": "sports", "icon_name": "Trophy"},
    {"name": "Tech", "slug": "tech", "icon_name": "Briefcase"}
]

for cat in categories:
    EventCategory.objects.create(**cat)
    print(f"Created category: {cat['name']}")

print("Categories setup completed.")
