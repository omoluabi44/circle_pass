from django.db import migrations

def seed_categories(apps, schema_editor):
    EventCategory = apps.get_model('core', 'EventCategory')
    
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
    
    for cat_name in categories:
        EventCategory.objects.create(name=cat_name, slug=cat_name.lower())

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0028_alter_event_end_time_alter_event_start_time'),
    ]

    operations = [
        migrations.RunPython(seed_categories),
    ]
