import re

with open('backend/api/tasks.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_task = """
@shared_task
def expire_pending_order(order_id):
    from core.models import Order, TicketType, DiscountRedemption
    from django.db import transaction
    from django.db.models import F
    from django.utils import timezone
    import logging

    logger = logging.getLogger(__name__)

    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            if order.status == 'PENDING' and order.expires_at and order.expires_at <= timezone.now():
                logger.info(f"Expiring pending order {order_id}")
                
                # Restore inventory
                for item in order.items.all():
                    TicketType.objects.filter(pk=item.ticket_type_id).update(
                        quantity_sold=F('quantity_sold') - item.quantity
                    )
                
                # Restore discount
                redemptions = DiscountRedemption.objects.filter(order=order)
                for red in redemptions:
                    discount = red.discount
                    discount.usage_count = F('usage_count') - 1
                    discount.save(update_fields=['usage_count'])
                
                order.status = 'CANCELLED'
                order.save(update_fields=['status'])
    except Order.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Failed to expire order {order_id}: {e}")
"""

if "def expire_pending_order" not in content:
    content += new_task
    with open('backend/api/tasks.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added expire_pending_order to tasks.py")
else:
    print("Task already exists in tasks.py")
