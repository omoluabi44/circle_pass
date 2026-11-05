from django.db import migrations, models


def mark_existing_announcements_sent(apps, schema_editor):
    """Announcements created before delivery tracking existed were delivered
    (or dropped) already; they must not sit at "Queued" and keep the UI polling."""
    EventAnnouncement = apps.get_model('core', 'EventAnnouncement')
    EventAnnouncement.objects.filter(delivery_status='QUEUED').update(
        delivery_status='SENT',
        sent_at=models.F('created_at'),
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0036_eventannouncement_delivery_fields'),
    ]

    operations = [
        migrations.RunPython(mark_existing_announcements_sent, migrations.RunPython.noop),
    ]
