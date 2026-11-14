from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0040_payout_provider'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventannouncement',
            name='ticket_type_ids',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='Ticket tier ids this announcement targets. Empty means every tier.',
            ),
        ),
    ]
