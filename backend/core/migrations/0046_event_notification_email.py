from django.db import migrations, models


def backfill(apps, schema_editor):
    """Existing events keep notifying the organizer they always used.

    New events must supply their own notification inbox; without this, events
    created before the field existed would have no recipient at all.
    """
    OrganizerProfile = apps.get_model('core', 'OrganizerProfile')
    Event = apps.get_model('core', 'Event')

    for profile in OrganizerProfile.objects.select_related('user'):
        if not (profile.contact_email or '').strip():
            email = (profile.user.email if profile.user_id else '') or ''
            if email:
                profile.contact_email = email
                profile.save(update_fields=['contact_email'])

    for event in Event.objects.exclude(organizer__isnull=True).select_related('organizer', 'organizer__user'):
        organizer = event.organizer
        email = (organizer.contact_email or '').strip()
        if not email and organizer.user_id:
            email = (organizer.user.email or '').strip()
        if email:
            event.notification_email = email
            event.save(update_fields=['notification_email'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0045_backfill_organizer_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='notification_email',
            field=models.EmailField(
                blank=True,
                default='',
                help_text=(
                    'Event-specific inbox for ticket sale and event notifications. '
                    'Each event can point at a different address.'
                ),
            ),
        ),
        migrations.AddField(
            model_name='organizerprofile',
            name='contact_email_updated_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text=(
                    'When the organizer last changed their contact email. '
                    'Used to enforce the 7-day change limit.'
                ),
            ),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
