from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0037_backfill_announcement_delivery_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='attendees',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Per-ticket holders: [{ticket_type_id, first_name, last_name, email}]',
            ),
        ),
    ]
