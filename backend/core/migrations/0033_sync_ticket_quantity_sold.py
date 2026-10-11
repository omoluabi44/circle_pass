from django.db import migrations
from django.db.models import Sum

def sync_quantity_sold(apps, schema_editor):
    TicketType = apps.get_model('core', 'TicketType')
    OrderItem = apps.get_model('core', 'OrderItem')

    for tt in TicketType.objects.all():
        completed_sold = OrderItem.objects.filter(
            ticket_type=tt,
            order__status='COMPLETED'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        tt.quantity_sold = completed_sold
        tt.save(update_fields=['quantity_sold'])

def reverse_sync(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_alter_waitlistentry_unique_together_and_more'),
    ]

    operations = [
        migrations.RunPython(sync_quantity_sold, reverse_sync),
    ]
