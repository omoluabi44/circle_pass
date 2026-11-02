from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0034_organizerverification_address_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='custom_field_responses',
            field=models.JSONField(blank=True, default=dict, help_text='Attendee answers: {field_id: value}'),
        ),
        migrations.CreateModel(
            name='EventCustomField',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=200)),
                ('field_type', models.CharField(choices=[('text', 'Short Text'), ('number', 'Number'), ('select', 'Dropdown')], default='text', max_length=20)),
                ('options', models.JSONField(blank=True, default=list, help_text='List of choices for select fields')),
                ('required', models.BooleanField(default=False)),
                ('position', models.PositiveIntegerField(default=0)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='custom_fields', to='core.event')),
            ],
            options={
                'ordering': ['position', 'id'],
            },
        ),
    ]
