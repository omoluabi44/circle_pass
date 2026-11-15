from django.db import migrations, models
import django.db.models.deletion


def copy_referral_discounts(apps, schema_editor):
    """Promote legacy REFERRAL-type discount rows to real Referral records.

    Before this, a referral was stored as ``Discount(type='REFERRAL')``. Those
    rows were never real discounts (value 0, no buyer discount), only tracking
    codes. Copying them across means organiser dashboards keep listing them
    once the Referrals section exists. The original rows are left untouched so
    historical totals and redemptions stay intact.
    """
    Discount = apps.get_model('core', 'Discount')
    Referral = apps.get_model('core', 'Referral')

    for discount in Discount.objects.filter(type='REFERRAL').select_related('event'):
        Referral.objects.get_or_create(
            event_id=discount.event_id,
            code=discount.code,
            defaults={'name': discount.code, 'is_active': discount.is_active},
        )


def drop_copied_referrals(apps, schema_editor):
    Referral = apps.get_model('core', 'Referral')
    Referral.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0042_discount_targeting'),
    ]

    operations = [
        migrations.CreateModel(
            name='Referral',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('code', models.CharField(max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='referrals', to='core.event')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('event', 'code')},
            },
        ),
        migrations.RunPython(copy_referral_discounts, drop_copied_referrals),
    ]
