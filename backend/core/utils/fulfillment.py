"""
Fulfillment logic for completing or failing orders.
Extracted to be reused by checkout, webhook, and verify endpoints.
"""
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from core.models import Order, Ticket, TicketType, OrganizerWallet, WalletTransaction
from core.utils.qr import generate_secure_qr_token
from core.utils.notifications import send_purchase_receipt

def fulfill_order(order, payment=None):
    """
    Atomically issue tickets for a completed order.
    Idempotent: if order.status is already COMPLETED, returns existing tickets.
    """
    if order.status == 'COMPLETED':
        return order.tickets.all()

    with transaction.atomic():
        # Lock the order to prevent concurrent fulfillments
        order_fresh = Order.objects.select_for_update().get(pk=order.pk)
        if order_fresh.status == 'COMPLETED':
            return order_fresh.tickets.all()

        tickets = []
        # select_related to avoid N+1 queries during loop
        for item in order_fresh.items.select_related('ticket_type').all():
            for _ in range(item.quantity):
                ticket = Ticket.objects.create(
                    order=order_fresh,
                    ticket_type=item.ticket_type,
                    attendee_name=order_fresh.guest_name or (order_fresh.attendee.user.get_full_name() if order_fresh.attendee else ''),
                    attendee_email=order_fresh.guest_email or (order_fresh.attendee.user.email if order_fresh.attendee else ''),
                    status='ISSUED',
                    qr_token=generate_secure_qr_token(),
                    issued_at=timezone.now(),
                )
                tickets.append(ticket)
        
        order_fresh.status = 'COMPLETED'
        order_fresh.save(update_fields=['status', 'updated_at'])

        # Credit organizer wallet: 95% of the actual amount Paystack collected.
        # CirclePass keeps its 5% commission, and pays Paystack's 1.5%+₦100 fee from that 5%.
        # We never credit from pending; funds go straight to available_balance.
        if payment and payment.amount > 0:
            organizer_credit = int(payment.amount * 0.95)
            cp_fee = payment.amount - organizer_credit  # 5% retained by CirclePass

            wallet, _ = OrganizerWallet.objects.get_or_create(organizer=order_fresh.event.organizer)
            OrganizerWallet.objects.filter(pk=wallet.pk).update(
                available_balance=F('available_balance') + organizer_credit,
                total_earnings=F('total_earnings') + organizer_credit,
            )
            wallet.refresh_from_db()

            WalletTransaction.objects.create(
                wallet=wallet,
                type='CREDIT',
                amount=organizer_credit,
                balance_after=wallet.available_balance,
                reference=f'Order #{order_fresh.pk}',
                description=(
                    f'Ticket sale – {order_fresh.event.title}. '
                    f'Gross: ₦{payment.amount / 100:,.0f}, '
                    f'CirclePass fee (5%): ₦{cp_fee / 100:,.0f}, '
                    f'Organizer (95%): ₦{organizer_credit / 100:,.0f}'
                ),
            )

        send_purchase_receipt(order_fresh, tickets)

    return tickets

def fail_order(order):
    """
    Fail a PENDING order and restore inventory.
    Idempotent.
    """
    with transaction.atomic():
        order_fresh = Order.objects.select_for_update().get(pk=order.pk)
        if order_fresh.status != 'PENDING':
            return  # Already transitioned (maybe to COMPLETED or already FAILED)
        
        for item in order_fresh.items.all():
            TicketType.objects.filter(pk=item.ticket_type_id).update(
                quantity_sold=F('quantity_sold') - item.quantity
            )
        order_fresh.status = 'FAILED'
        order_fresh.save(update_fields=['status', 'updated_at'])
