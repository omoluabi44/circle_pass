import re

from django.db import migrations


PHONE_RE = re.compile(
    r'(\+?234[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}'  # +234 801 234 5678
    r'|\b0\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b)'          # 0801 234 5678
)


def normalise(raw):
    """Return a 0-prefixed local number, or '' if it is not a usable phone."""
    digits = re.sub(r'\D', '', raw or '')
    if digits.startswith('234') and len(digits) == 13:
        digits = '0' + digits[3:]
    if len(digits) == 11 and digits.startswith('0'):
        return digits
    return ''


def backfill_phone_numbers(apps, schema_editor):
    """Give existing organizers a contact number where they already published one.

    Organizers who signed up before the post-sign-up popup never supplied a
    phone number, so the admin team had no way to reach them. Most of them did
    publish a phone number in their event's "organizer contact" field, so we
    copy the first usable one across. Anything ambiguous or missing is left
    blank for the admin to fill in on the organizer profile.
    """
    OrganizerProfile = apps.get_model('core', 'OrganizerProfile')
    Event = apps.get_model('core', 'Event')

    for profile in OrganizerProfile.objects.filter(phone_number=''):
        events = (
            Event.objects
            .filter(organizer=profile)
            .exclude(organizer_contact='')
            .order_by('-start_time')
        )
        for event in events:
            match = PHONE_RE.search(event.organizer_contact or '')
            if not match:
                continue
            phone = normalise(match.group(1))
            if phone:
                profile.phone_number = phone
                profile.save(update_fields=['phone_number'])
                break


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0044_organizer_onboarding'),
    ]

    operations = [
        migrations.RunPython(backfill_phone_numbers, migrations.RunPython.noop),
    ]
