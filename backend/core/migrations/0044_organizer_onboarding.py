from django.db import migrations, models


def mark_existing_organizers_onboarded(apps, schema_editor):
    """Do not interrupt organizers who were already using the platform.

    The post-sign-up profile popup exists for new accounts. Profiles that
    predate this feature are marked complete so nobody gets a blocking modal
    mid-event; they can still add their WhatsApp number from Profile Settings.
    """
    OrganizerProfile = apps.get_model('core', 'OrganizerProfile')
    OrganizerProfile.objects.update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0043_referral'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizerprofile',
            name='phone_number',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Organizer WhatsApp number. Editable at any time from Profile Settings.',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='organizerprofile',
            name='onboarding_completed',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Set once the organizer has supplied their full name and phone '
                    'number after sign-up. Full name is locked from then on.'
                ),
            ),
        ),
        migrations.RunPython(
            mark_existing_organizers_onboarded,
            migrations.RunPython.noop,
        ),
    ]
