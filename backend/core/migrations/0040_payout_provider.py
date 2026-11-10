from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0039_platformsetting'),
    ]

    operations = [
        migrations.AddField(
            model_name='payout',
            name='provider',
            field=models.CharField(
                default='PAYSTACK',
                help_text='Gateway used to settle this payout.',
                max_length=20,
            ),
        ),
    ]
