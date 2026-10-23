"""
Fulfillment logic for completing or failing orders.
Extracted to be reused by checkout, webhook, and verify endpoints.
"""
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from core.models import Order, Ticket, TicketType, OrganizerWallet, WalletTransaction
from core.utils.qr import generate_secure_qr_token
from core.utils.notifications import send_purchase_receipt, send_organizer_sales_notification

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
                    status='ACTIVE',
                    qr_token=generate_secure_qr_token(),
                    issued_at=timezone.now(),
                )
                tickets.append(ticket)
        
        # Atomically increment quantity_sold only upon verified payment / fulfillment
        for item in order_fresh.items.select_related('ticket_type').all():
            TicketType.objects.filter(pk=item.ticket_type_id).update(
                quantity_sold=F('quantity_sold') + item.quantity
            )

        order_fresh.status = 'COMPLETED'
        order_fresh.save(update_fields=['status', 'updated_at'])

        # Credit organizer wallet: 95% of the actual amount Paystack collected.
        # CirclePass keeps its 5% commission, and pays Paystack's 1.5%+₦100 fee from that 5%.
        # We never credit from pending; funds go straight to available_balance.
        pmt = payment or getattr(order_fresh, 'payment', None)
        if pmt and pmt.amount > 0:
            if order_fresh.fee_amount > 0:
                # Buyer paid the fee. CirclePass takes exactly what was charged as the fee.
                cp_fee = order_fresh.fee_amount
                organizer_credit = pmt.amount - cp_fee
            else:
                # Organizer absorbed the fee. CirclePass takes 5% of the final payment.
                cp_fee = int(pmt.amount * 0.05)
                organizer_credit = pmt.amount - cp_fee

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
                    f'Gross: ₦{pmt.amount / 100:,.0f}, '
                    f'CirclePass fee (5%): ₦{cp_fee / 100:,.0f}, '
                    f'Organizer (95%): ₦{organizer_credit / 100:,.0f}'
                ),
            )

        # Complete linked waitlist entries if any
        order_fresh.waitlist_entries.filter(status='ACCEPTED').update(status='COMPLETED')

        # Check if sold out to notify organizer
        try:
            from api.tasks import check_sold_out_and_notify
            check_sold_out_and_notify.delay(order_fresh.event_id)
        except Exception:
            pass

        try:
            send_purchase_receipt(order_fresh, tickets)
        except Exception as e:
            pass
        try:
            send_organizer_sales_notification(order_fresh, tickets)
        except Exception as e:
            pass

    return tickets

def fail_order(order):
    """
    Fail a PENDING order.
    Idempotent.
    """
    with transaction.atomic():
        order_fresh = Order.objects.select_for_update().get(pk=order.pk)
        if order_fresh.status != 'PENDING':
            return  # Already transitioned (maybe to COMPLETED or already FAILED)
        
        # Restore discount redemption usage if applicable
        from core.models import DiscountRedemption
        redemptions = DiscountRedemption.objects.filter(order=order_fresh)
        for red in redemptions:
            discount = red.discount
            discount.usage_count = F('usage_count') - 1
            discount.save(update_fields=['usage_count'])

        order_fresh.status = 'FAILED'
        order_fresh.save(update_fields=['status', 'updated_at'])

        # Expire linked waitlist entries if any
        order_fresh.waitlist_entries.filter(status='ACCEPTED').update(status='EXPIRED')
