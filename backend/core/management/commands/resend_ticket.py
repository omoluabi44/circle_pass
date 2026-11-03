from django.core.management.base import BaseCommand
from core.models import Order, Ticket
from core.utils.notifications import send_purchase_receipt

class Command(BaseCommand):
    help = 'Resend ticket purchase receipts by email or order ID'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email of the buyer')
        parser.add_argument('--order-id', type=int, help='Order ID')

    def handle(self, *args, **options):
        email = options.get('email')
        order_id = options.get('order_id')

        if not email and not order_id:
            self.stderr.write(self.style.ERROR('Please provide --email or --order-id'))
            return

        orders = Order.objects.filter(status='COMPLETED')
        if order_id:
            orders = orders.filter(id=order_id)
        if email:
            email = email.strip()
            orders = orders.filter(guest_email__iexact=email) | orders.filter(attendee__user__email__iexact=email)

        if not orders.exists():
            self.stdout.write(self.style.WARNING(f'No completed orders found for {email or order_id}'))
            return

        for order in orders:
            tickets = order.tickets.all()
            buyer_email = order.guest_email or (order.attendee.user.email if order.attendee else 'N/A')
            self.stdout.write(f"\nOrder #{order.id} - Event: {order.event.title}")
            self.stdout.write(f"Recipient: {buyer_email}")
            self.stdout.write(f"Tickets count: {tickets.count()}")
            for t in tickets:
                self.stdout.write(f"  - Ticket #{t.id} [{t.ticket_type.name}]: https://thecirclepass.com/t/{t.qr_token}")

            try:
                send_purchase_receipt(order, tickets)
                self.stdout.write(self.style.SUCCESS(f"Successfully sent receipt email to {buyer_email}"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to send email to {buyer_email}: {e}"))
