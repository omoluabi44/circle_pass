from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0035_eventcustomfield_order_custom_field_responses'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventannouncement',
            name='audience',
            field=models.CharField(default='attendees_only', max_length=20),
        ),
        migrations.AddField(
            model_name='eventannouncement',
            name='recipients_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='eventannouncement',
            name='delivered_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='eventannouncement',
            name='delivery_status',
            field=models.CharField(
                choices=[
                    ('QUEUED', 'Queued'),
                    ('SENDING', 'Sending'),
                    ('SENT', 'Sent'),
                    ('PARTIAL', 'Sent with errors'),
                    ('FAILED', 'Failed'),
                    ('NO_RECIPIENTS', 'No recipients'),
                ],
                default='QUEUED',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='eventannouncement',
            name='delivery_error',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='eventannouncement',
            name='sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
