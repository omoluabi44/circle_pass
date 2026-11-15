from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0041_eventannouncement_ticket_type_ids'),
    ]

    operations = [
        migrations.AddField(
            model_name='discount',
            name='ticket_type_ids',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='Ticket classes this code applies to. Empty means every class.',
            ),
        ),
        migrations.AddField(
            model_name='discount',
            name='allow_multiple_per_user',
            field=models.BooleanField(
                default=True,
                help_text='When false, a buyer can redeem this code only once.',
            ),
        ),
    ]
