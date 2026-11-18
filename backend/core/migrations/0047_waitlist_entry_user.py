"""Link waitlist requests to the signed-in attendee.

Waitlist entries used to be matched to an account only by the email typed in the
form, so a request made with a different (or mistyped) address never appeared on
the attendee dashboard. Entries now remember the account that created them, and
existing rows are linked by email.
"""
from django.db import migrations, models


def link_by_email(apps, schema_editor):
    User = apps.get_model('core', 'User')
    WaitlistEntry = apps.get_model('core', 'WaitlistEntry')

    by_email = {
        (user.email or '').strip().lower(): user
        for user in User.objects.exclude(email='')
    }
    for entry in WaitlistEntry.objects.filter(user__isnull=True):
        user = by_email.get((entry.email or '').strip().lower())
        if user is not None:
            entry.user = user
            entry.save(update_fields=['user'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0046_event_notification_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='waitlistentry',
            name='user',
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    'Signed-in attendee who joined this waitlist. Lets the attendee '
                    'dashboard show the request even if the form email differs.'
                ),
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='waitlist_entries',
                to='core.user',
            ),
        ),
        migrations.RunPython(link_by_email, migrations.RunPython.noop),
    ]
