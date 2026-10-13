import re

with open('backend/api/views_checkout.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the check_sold_out_and_notify try-except block to also queue the expiration
old_code = """                # Queue check for sold out
                try:
                    from .tasks import check_sold_out_and_notify
                    check_sold_out_and_notify.delay(event.id)
                except Exception as e:
                    logger.warning("Failed to queue sold-out check for event %s: %s", event.id, e)"""

new_code = """                # Queue check for sold out
                try:
                    from .tasks import check_sold_out_and_notify, expire_pending_order
                    check_sold_out_and_notify.delay(event.id)
                    
                    if total_amount > 0:
                        # Schedule expiration task 30 minutes (1800 seconds) from now
                        expire_pending_order.apply_async((order.id,), countdown=1800)
                except Exception as e:
                    logger.warning("Failed to queue background tasks for event %s: %s", event.id, e)"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('backend/api/views_checkout.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated views_checkout.py successfully")
else:
    print("Could not find old code in views_checkout.py")
