from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Event, Order
from core.utils.notifications import send_event_reminder_email
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sends reminder emails for events starting in 24 hours.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        target_start = now + timedelta(hours=24)
        # 1 hour window to avoid sending multiple times
        window_end = target_start + timedelta(hours=1)
        
        events = Event.objects.filter(
            status='LIVE',
            start_date__gte=target_start,
            start_date__lt=window_end
        )
        
        count = 0
        for event in events:
            orders = Order.objects.filter(event=event, status='COMPLETED')
            for order in orders:
                try:
                    send_event_reminder_email(order)
                    count += 1
                except Exception as e:
                    logger.error(f"Error sending reminder to order {order.id}: {e}")
        
        self.stdout.write(self.style.SUCCESS(f'Successfully sent {count} reminder emails.'))
