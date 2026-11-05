"""
Checkout view with atomic oversell prevention.

Handles both free (₦0) and paid ticket checkout flows.
Free tickets are issued immediately; paid tickets create a pending order
and return Paystack initialization data.
"""
import logging

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Event, TicketType, Order, OrderItem, Ticket, AttendeeProfile, Payment, WaitlistEntry
from core.utils.qr import generate_secure_qr_token
from core.utils.paystack import initialize_transaction
from core.utils.fulfillment import fulfill_order
from api.serializers import CheckoutRequestSerializer, OrderSerializer, TicketSerializer

logger = logging.getLogger(__name__)

# CirclePass service fee: 5%
CIRCLEPASS_FEE_RATE = 5  # percent


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/

    Atomic checkout endpoint that:
    1. Validates requested ticket types and quantities.
    2. Locks inventory rows (SELECT ... FOR UPDATE) to prevent overselling.
    3. Computes subtotal, fee, and total.
    4. For free orders (₦0): immediately issues tickets.
    5. For paid orders: creates a PENDING order and initializes Paystack.
    """
    permission_classes = [AllowAny]  # Supports both authenticated and guest checkout

    def post(self, request):
        serializer = CheckoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        event_id = data['event_id']
        items = data['items']
        guest_name = data.get('guest_name', '')
        guest_email = data.get('guest_email', '')
        guest_phone = data.get('guest_phone', '')
        custom_field_responses = request.data.get('custom_field_responses', {})
        if not isinstance(custom_field_responses, dict):
            custom_field_responses = {}

        # Per-ticket holder details (optional). When provided, there must be
        # exactly one entry per ticket, matching the quantities per tier.
        attendees = []
        for raw in data.get('attendees') or []:
            attendees.append({
                'ticket_type_id': raw['ticket_type_id'],
                'first_name': (raw.get('first_name') or '').strip(),
                'last_name': (raw.get('last_name') or '').strip(),
                'email': (raw.get('email') or '').strip().lower(),
            })

        if attendees:
            expected_by_type = {}
            for item in items:
                expected_by_type[item['ticket_type_id']] = (
                    expected_by_type.get(item['ticket_type_id'], 0) + item['quantity']
                )
            actual_by_type = {}
            for a in attendees:
                actual_by_type[a['ticket_type_id']] = (
                    actual_by_type.get(a['ticket_type_id'], 0) + 1
                )
            if actual_by_type != expected_by_type:
                return Response(
                    {'detail': 'Attendee details must match exactly one entry per selected ticket.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if any(not a['first_name'] or not a['email'] for a in attendees):
                return Response(
                    {'detail': 'Each attendee needs a first name and a valid email address.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validate event exists and is purchasable
        try:
            event = Event.objects.get(pk=event_id, status__in=['PUBLISHED', 'LIVE'])
        except Event.DoesNotExist:
            return Response(
                {'detail': 'Event not found or not available for purchase.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Block checkout if organizer has paused sales
        if event.sales_paused:
            return Response(
                {'detail': 'Ticket sales are currently paused for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Resolve attendee profile (if authenticated)
        attendee = None
        if request.user.is_authenticated:
            try:
                attendee = AttendeeProfile.objects.get(user=request.user)
            except AttendeeProfile.DoesNotExist:
                # Auto-create attendee profile for authenticated users
                attendee = AttendeeProfile.objects.create(user=request.user)
        elif not guest_email:
            return Response(
                {'detail': 'Guest checkout requires guest_email.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect requested ticket type IDs
        requested_type_ids = [item['ticket_type_id'] for item in items]

        # ============================================
        # BEGIN ATOMIC TRANSACTION
        # ============================================
        try:
            with transaction.atomic():
                # Lock the ticket type rows for update to prevent race conditions
                ticket_types = (
                    TicketType.objects
                    .select_for_update()
                    .filter(id__in=requested_type_ids, event=event, is_active=True)
                )

                # Build lookup
                tt_map = {tt.id: tt for tt in ticket_types}

                # Validate all requested types exist and belong to this event
                for item in items:
                    tt = tt_map.get(item['ticket_type_id'])
                    if tt is None:
                        return Response(
                            {'detail': f'Ticket type {item["ticket_type_id"]} not found or not active for this event.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Check sale window
                    now = timezone.now()
                    if tt.sale_start and now < tt.sale_start:
                        return Response(
                            {'detail': f'"{tt.name}" tickets are not yet on sale.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if tt.sale_end and now > tt.sale_end:
                        return Response(
                            {'detail': f'"{tt.name}" ticket sales have ended.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Sync quantity_sold with authoritative completed orders
                    completed_sold = OrderItem.objects.filter(
                        ticket_type=tt,
                        order__status='COMPLETED'
                    ).aggregate(total=Sum('quantity'))['total']
                    if completed_sold is not None and tt.quantity_sold != completed_sold:
                        TicketType.objects.filter(pk=tt.pk).update(quantity_sold=completed_sold)
                        tt.quantity_sold = completed_sold

                    # Resolve active ACCEPTED waitlist reservation if present
                    waitlist_token = (data.get('waitlist_token') or request.data.get('waitlist_token') or '').strip()
                    buyer_lookup_email = (guest_email or (request.user.email if request.user.is_authenticated else '')).strip()
                    waitlist_entry = None
                    if waitlist_token:
                        waitlist_entry = WaitlistEntry.objects.select_for_update().filter(
                            access_token=waitlist_token,
                            event=event,
                            ticket_type=tt,
                            status='ACCEPTED'
                        ).first()
                    if not waitlist_entry and buyer_lookup_email:
                        waitlist_entry = WaitlistEntry.objects.select_for_update().filter(
                            event=event,
                            ticket_type=tt,
                            email__iexact=buyer_lookup_email,
                            status='ACCEPTED'
                        ).first()
                    if waitlist_entry:
                        item['_waitlist_entry'] = waitlist_entry
                        if tt.quantity_sold + item['quantity'] > tt.quantity:
                            needed_qty = (tt.quantity_sold + item['quantity']) - tt.quantity
                            TicketType.objects.filter(pk=tt.pk).update(
                                quantity=F('quantity') + needed_qty
                            )
                            tt.refresh_from_db()

                    # Check inventory — OVERSELL PREVENTION
                    if tt.quantity_sold + item['quantity'] > tt.quantity:
                        remaining = tt.quantity - tt.quantity_sold
                        return Response(
                            {'detail': f'Not enough "{tt.name}" tickets. Only {remaining} remaining.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # ============================================
                # COMPUTE PRICING
                # ============================================
                subtotal = 0
                line_items_data = []
                for item in items:
                    tt = tt_map[item['ticket_type_id']]
                    line_total = tt.price * item['quantity']
                    subtotal += line_total
                    line_items_data.append({
                        'ticket_type': tt,
                        'quantity': item['quantity'],
                        'unit_price': tt.price,
                        'line_total': line_total,
                    })

                # Apply Discount if provided
                discount_amount = 0
                discount_code = data.get('discount_code', '').strip().upper()
                valid_discount = None
                
                if discount_code:
                    from core.models import Discount
                    try:
                        discount = Discount.objects.get(event=event, code=discount_code, is_active=True)
                        now_dt = timezone.now()
                        if (discount.usage_limit == 0 or discount.usage_count < discount.usage_limit) and \
                           (not discount.valid_from or now_dt >= discount.valid_from) and \
                           (not discount.valid_until or now_dt <= discount.valid_until):
                            
                            valid_discount = discount
                            
                            if discount.type == 'PERCENTAGE':
                                discount_amount = int(subtotal * (discount.value / 100.0))
                            else:
                                discount_amount = min(discount.value, subtotal)
                    except Discount.DoesNotExist:
                        pass # Ignore invalid codes silently for now, or you can return error
                        
                # Calculate fee (5% of subtotal, only for paid orders where buyer pays)
                if max(0, subtotal - discount_amount) == 0:
                    fee_amount = 0  # Free tickets: no fee ever
                elif event.absorb_fees:
                    fee_amount = 0  # Organizer absorbs the fee
                else:
                    fee_amount = int(max(0, subtotal - discount_amount) * CIRCLEPASS_FEE_RATE / 100)

                total_amount = subtotal - discount_amount + fee_amount

                # ============================================
                # CREATE ORDER
                # ============================================
                order = Order.objects.create(
                    attendee=attendee,
                    guest_email=guest_email,
                    guest_name=guest_name,
                    guest_phone=guest_phone,
                    event=event,
                    subtotal=subtotal,
                    discount_amount=discount_amount,
                    fee_amount=fee_amount,
                    total_amount=total_amount,
                    status='PENDING',
                    referral_code=request.data.get('referral_code', ''),
                    custom_field_responses=custom_field_responses,
                    attendees=attendees,
                    expires_at=timezone.now() + timezone.timedelta(minutes=30) if total_amount > 0 else None
                )

                # Create order items
                for li in line_items_data:
                    OrderItem.objects.create(
                        order=order,
                        ticket_type=li['ticket_type'],
                        quantity=li['quantity'],
                        unit_price=li['unit_price'],
                        line_total=li['line_total'],
                    )
                    
                # Create discount redemption if applicable
                if valid_discount:
                    from core.models import DiscountRedemption
                    DiscountRedemption.objects.create(
                        discount=valid_discount,
                        order=order
                    )
                    valid_discount.usage_count += 1
                    valid_discount.save(update_fields=['usage_count'])

                # Note: Inventory quantity_sold is recorded only upon successful payment fulfillment
                # (in fulfill_order). Free orders fulfill immediately below.
                # Link any matched waitlist entry to this order so fulfill_order marks it COMPLETED
                for item in items:
                    wl_entry = item.get('_waitlist_entry')
                    if wl_entry:
                        if wl_entry.order_id and wl_entry.order_id != order.id:
                            Order.objects.filter(pk=wl_entry.order_id, status='PENDING').update(status='CANCELLED')
                        wl_entry.order = order
                        wl_entry.save(update_fields=['order', 'updated_at'])
                # Paid orders remain PENDING until Paystack confirms payment.
                if total_amount > 0:
                    try:
                        from .tasks import expire_pending_order
                        # Schedule expiration task 30 minutes (1800 seconds) from now
                        expire_pending_order.apply_async((order.id,), countdown=1800)
                    except Exception as e:
                        logger.warning("Failed to queue expiration task for order %s: %s", order.id, e)

                # ============================================
                # FREE TICKET PATH: Issue tickets immediately
                # ============================================
                if total_amount == 0:
                    payment = Payment.objects.create(
                        order=order,
                        reference=f'CP-{order.pk}-FREE-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                        amount=0,
                        status='SUCCESS',
                        provider='FREE'
                    )

                    tickets = fulfill_order(order, payment=payment)

                    return Response({
                        'detail': 'Registration complete. Tickets issued.',
                        'payment_required': False,
                        'order': OrderSerializer(order).data,
                        'tickets': TicketSerializer(tickets, many=True, context={'request': request}).data,
                    }, status=status.HTTP_201_CREATED)

                # ============================================
                # PAID TICKET PATH: Initialize Paystack server-side
                # ============================================
                buyer_email = guest_email or (request.user.email if request.user.is_authenticated else '')

                if not buyer_email:
                    # Paystack requires an email. Raise to trigger atomic rollback.
                    raise ValueError("A valid email address is required to process payment.")

                reference = f'CP-{order.pk}-{timezone.now().strftime("%Y%m%d%H%M%S")}'

                payment = Payment.objects.create(
                    order=order,
                    reference=reference,
                    amount=total_amount,
                    status='PENDING',
                    provider='PAYSTACK'
                )

                # Initialize with Paystack — raises on HTTP or connection error
                paystack_data = initialize_transaction(
                    amount=total_amount,
                    email=buyer_email,
                    reference=reference,
                )

                # Persist the access code / auth URL returned by Paystack
                payment.provider_data = paystack_data.get('data', {})
                payment.save(update_fields=['provider_data'])

                # Queue abandoned cart emails
                try:
                    from .tasks import send_abandoned_cart_email
                    send_abandoned_cart_email.apply_async((order.id, '1hr'), countdown=3600) # 1 hour
                    send_abandoned_cart_email.apply_async((order.id, '24hr'), countdown=86400) # 24 hours
                    send_abandoned_cart_email.apply_async((order.id, '7days'), countdown=604800) # 7 days
                except Exception as e:
                    logger.warning("Failed to queue abandoned cart emails for order %s: %s", order.id, e)

                return Response({
                    'detail': 'Order created. Proceed to payment.',
                    'payment_required': True,
                    'order': OrderSerializer(order).data,
                    'paystack': {
                        'access_code': paystack_data['data']['access_code'],
                        'authorization_url': paystack_data['data']['authorization_url'],
                        'reference': reference,
                    },
                }, status=status.HTTP_201_CREATED)

        except ValueError as exc:
            # Raised for business-rule errors (e.g. missing email).
            # The atomic block already rolled back everything.
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as exc:
            # Unexpected failure
            logger.exception("Checkout failed: %s", exc)
            return Response(
                {'detail': f'Checkout could not be completed. Please try again. ({exc})'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
