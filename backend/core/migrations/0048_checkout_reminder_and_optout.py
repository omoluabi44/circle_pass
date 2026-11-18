from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0047_waitlist_entry_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='checkout_reminder_sent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When the "you left your ticket purchase unfinished" reminder was emailed.',
            ),
        ),
        migrations.CreateModel(
            name='EmailOptOut',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('reason', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
