import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from core.models import EventCategory

# Delete all existing categories to ensure exact match
EventCategory.objects.all().delete()

categories = [
    "Music",
    "Comedy",
    "Sports",
    "Festivals",
    "Nightlife",
    "Tech",
    "Conference",
    "Seminar"
]

for idx, cat_name in enumerate(categories):
    EventCategory.objects.create(name=cat_name, slug=cat_name.lower())

print("Categories seeded successfully!")
