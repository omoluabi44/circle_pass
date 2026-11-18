from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0048_checkout_reminder_and_optout'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='organizer_sale_notified_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When the organizer was told about this sale. Resends never repeat it.',
            ),
        ),
    ]