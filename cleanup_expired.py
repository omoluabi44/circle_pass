import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'circlepass_backend.settings')
django.setup()

from django.utils import timezone
from django.db.models import F
from core.models import Order, TicketType, DiscountRedemption
from django.db import transaction

now = timezone.now()
expired_orders = Order.objects.filter(status='PENDING', expires_at__lt=now)

print(f"Found {expired_orders.count()} expired pending orders.")

for order in expired_orders:
    with transaction.atomic():
        print(f"Reverting Order {order.id} for Event {order.event.title}")
        
        # Restore inventory
        for item in order.items.all():
            TicketType.objects.filter(pk=item.ticket_type_id).update(
                quantity_sold=F('quantity_sold') - item.quantity
            )
            print(f"  Restored {item.quantity} tickets to {item.ticket_type.name}")
        
        # Restore discount
        redemptions = DiscountRedemption.objects.filter(order=order)
        for red in redemptions:
            discount = red.discount
            discount.usage_count = F('usage_count') - 1
            discount.save(update_fields=['usage_count'])
        
        # Mark cancelled
        order.status = 'CANCELLED'
        order.save(update_fields=['status'])

print("Done cleaning up expired orders!")
