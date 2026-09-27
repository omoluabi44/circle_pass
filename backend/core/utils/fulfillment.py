"""
Fulfillment logic for completing or failing orders.
Extracted to be reused by checkout, webhook, and verify endpoints.
"""
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from core.models import Order, Ticket, TicketType, OrganizerWallet
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

        # Credit organizer wallet if this is a paid order (and not free/absorbed completely)
        if payment and payment.amount > 0:
            credit_amount = order_fresh.subtotal - order_fresh.discount_amount
            # The organizer wallet receives subtotal minus discount. 
            # If the organizer absorbed fees, the fee_amount is 0 in the order anyway,
            # or rather if they absorbed fees, they receive (subtotal - discount - fee).
            # Therefore, organizer gets: Subtotal - Discount - (Fee if absorbed, else 0)
            if order_fresh.event.absorb_fees:
                cp_fee = int(order_fresh.subtotal * 0.05)
                credit_amount = credit_amount - cp_fee if order_fresh.event.absorb_fees else credit_amount
            
            # Get or create the wallet
            wallet, _ = OrganizerWallet.objects.get_or_create(organizer=order_fresh.event.organizer)
            # Atomic update of pending_balance and total_earnings
            OrganizerWallet.objects.filter(pk=wallet.pk).update(
                pending_balance=F('pending_balance') + credit_amount,
                total_earnings=F('total_earnings') + credit_amount,
            )
            wallet.refresh_from_db()

            # Create wallet transaction ledger entry for audit trail
            from core.models import WalletTransaction
            WalletTransaction.objects.create(
                wallet=wallet,
                type='CREDIT',
                amount=credit_amount,
                balance_after=wallet.available_balance,
                reference=f'Order #{order_fresh.pk}',
                description=f'Revenue from order for {order_fresh.event.title}',
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
