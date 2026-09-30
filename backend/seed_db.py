import os
import django
from datetime import datetime, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import OrganizerProfile, EventCategory, Venue, Event, TicketType, OrganizerVerification

User = get_user_model()

print("Cleaning existing data...")
User.objects.all().delete()
EventCategory.objects.all().delete()
Venue.objects.all().delete()
Event.objects.all().delete()

print("Creating Categories...")
cat_music = EventCategory.objects.create(name="Music", slug="music")
cat_tech = EventCategory.objects.create(name="Technology", slug="tech")
cat_biz = EventCategory.objects.create(name="Business", slug="business")

print("Creating Users & Organizers...")
# Admins
admin1 = User.objects.create_superuser(username="omoluabi", email="emmanuelogunleye441999@gmail.com", password="Password123!")
admin2 = User.objects.create_superuser(username="omoluabi1", email="emmanuelogunleye44199999@gmail.com", password="Password123!")

# Organizer
org_user = User.objects.create_user(username="admin", email="admin@example.com", password="Password123!", role="ORGANIZER")
# Organizer profile gets auto-created by signals, so let's fetch it
org_profile = OrganizerProfile.objects.get(user=org_user)
org_profile.company_name = "CirclePass Events"
org_profile.is_verified = True
org_profile.save()

verification = OrganizerVerification.objects.get(organizer=org_profile)
verification.status = "Verified"
verification.save()

org_user2 = User.objects.create_user(username="mascara", email="ogunleyeemanuel441999@gmail.com", password="Password123!", role="ORGANIZER")
org_profile2 = OrganizerProfile.objects.get(user=org_user2)
org_profile2.company_name = "Mascara Entertainment"
org_profile2.save()

# Attendee
att_user = User.objects.create_user(username="admin2", email="admin2@example.com", password="Password123!", role="ATTENDEE")

print("Creating Venues...")
venue1 = Venue.objects.create(name="Eko Convention Centre", location="Victoria Island, Lagos")
venue2 = Venue.objects.create(name="Landmark Event Centre", location="Oniru, Lagos")

print("Creating Events...")
now = timezone.now()

# Event 1: Tech Conference (Paid)
event1 = Event.objects.create(
    organizer=org_profile,
    category=cat_tech,
    title="Lagos Tech Fest 2026",
    slug="lagos-tech-fest-2026",
    description="The biggest technology conference in West Africa featuring top founders and engineers.",
    venue=venue1,
    start_time=now + timedelta(days=14),
    end_time=now + timedelta(days=16),
    status='PUBLISHED',
    cover_image='/image-folders/event-images/photo_2026-09-17_16-13-26.jpg',
    is_online=False
)
TicketType.objects.create(event=event1, name="Standard Pass", tier="REGULAR", price=1500000, quantity=500) # 15,000 NGN
TicketType.objects.create(event=event1, name="VIP Pass", tier="VIP", price=5000000, quantity=100) # 50,000 NGN

# Event 2: Music Concert (Paid)
event2 = Event.objects.create(
    organizer=org_profile2,
    category=cat_music,
    title="Afrobeats Super Jam",
    slug="afrobeats-super-jam",
    description="A night of non-stop Afrobeats music with surprise guest artists.",
    venue=venue2,
    start_time=now + timedelta(days=30),
    end_time=now + timedelta(days=30, hours=6),
    status='PUBLISHED',
    cover_image='/image-folders/event-images/photo_2026-09-17_16-13-26.jpg',
    is_online=False
)
TicketType.objects.create(event=event2, name="Early Bird", tier="EARLY_BIRD", price=500000, quantity=200) # 5,000 NGN
TicketType.objects.create(event=event2, name="Regular", tier="REGULAR", price=1000000, quantity=1000) # 10,000 NGN

# Event 3: Free Business Webinar (Online)
event3 = Event.objects.create(
    organizer=org_profile,
    category=cat_biz,
    title="Startup Funding Masterclass",
    slug="startup-funding-masterclass",
    description="Learn how to raise your seed round in this free online webinar.",
    start_time=now + timedelta(days=7),
    end_time=now + timedelta(days=7, hours=2),
    status='PUBLISHED',
    is_online=True,
    cover_image='/image-folders/event-images/photo_2026-09-17_16-13-26.jpg',
)
TicketType.objects.create(event=event3, name="Free Access", tier="FREE", price=0, quantity=1000)

print("Database seeded successfully with Users, Organizers, Categories, Venues, and Events!")
