"""
Find My Ticket API view.
Public (unauthenticated) endpoint for guests to look up their tickets.
"""
import re

from django.db.models import Q, Count
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from core.models import Order, Payment, Ticket


class FindTicketRateThrottle(AnonRateThrottle):
    """Limit unauthenticated find-ticket lookups to 5/minute per IP."""
    rate = '5/min'


class ResendTicketRateThrottle(AnonRateThrottle):
    """Ticket email resends are deliberately stingy: 3/minute per IP."""
    rate = '3/min'


def mask_email(email: str) -> str:
    """Mask email: j***n@example.com"""
    if not email or '@' not in email:
        return '***'
    local, domain = email.rsplit('@', 1)
    if len(local) <= 2:
        masked = local[0] + '***'
    else:
        masked = local[0] + '***' + local[-1]
    return f'{masked}@{domain}'


def mask_name(name: str) -> str:
    """Mask name: J*** D***"""
    if not name:
        return '***'
    parts = name.split()
    masked_parts = []
    for part in parts:
        if len(part) <= 1:
            masked_parts.append(part + '***')
        else:
            masked_parts.append(part[0] + '***')
    return ' '.join(masked_parts)


def resend_order_tickets(order):
    """Re-send an order's ticket emails through the purchase flow.

    Returns ``(sent, failed, recipients)`` where the counts come from the
    EmailLog rows the sender writes, so the caller reports what actually left
    the server. Tickets are only ever delivered to the address they were
    issued to.
    """
    from core.models import EmailLog
    from core.utils.notifications import (
        group_tickets_by_recipient,
        send_purchase_receipt,
    )

    tickets = list(order.tickets.all())
    if not tickets:
        return 0, 0, []

    buyer_email = (
        order.guest_email or (order.attendee.user.email if order.attendee else '')
    ).strip().lower()
    expected = list(group_tickets_by_recipient(tickets, buyer_email).keys())
    if not expected:
        return 0, 0, []

    send_purchase_receipt(order, tickets)

    sent = 0
    failed = 0
    for recipient in expected:
        logged = EmailLog.objects.filter(
            recipient__iexact=recipient,
            subject__startswith='Your Tickets for',
        ).order_by('-created_at').first()
        if logged and logged.status == 'Sent':
            sent += 1
        else:
            failed += 1

    return sent, failed, expected


class FindTicketView(APIView):
    """
    POST /api/tickets/find/
    
    Accepts: { "reference": "...", "email": "...", "phone": "..." }
    At least one field required.
    
    Returns masked ticket summaries. Does NOT expose QR tokens.
    Rate-limited to 5 requests/minute per IP.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [FindTicketRateThrottle]

    def post(self, request):
        from api.serializers import FindTicketRequestSerializer

        serializer = FindTicketRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get reference from either 'reference' or 'order_reference'
        reference = data.get('reference', '').strip() or data.get('order_reference', '').strip()
        email = data.get('email', '').strip().lower()
        # Get phone from either 'phone' or 'phone_number'
        phone = data.get('phone', '').strip() or data.get('phone_number', '').strip()

        # Build query across orders
        order_filter = Q()

        if reference:
            # Search by payment reference
            order_filter |= Q(payment__reference__iexact=reference)

        if email:
            # Search by guest email, attendee account email, or the email the
            # ticket itself was issued to (buying for someone else).
            order_filter |= Q(guest_email__iexact=email)
            order_filter |= Q(attendee__user__email__iexact=email)
            order_filter |= Q(tickets__attendee_email__iexact=email)

        if phone:
            # Phone search
            order_filter |= Q(guest_phone__icontains=phone)
            order_filter |= Q(attendee__phone_number__icontains=phone)

        if not order_filter:
            return Response(
                {'detail': 'No valid search criteria provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Self-healing: if searched by reference, check if it was paid on Paystack
        if reference:
            pending_pay = Payment.objects.filter(
                reference__iexact=reference,
                status__in=['PENDING', 'FAILED']
            ).select_related('order').first()
            if pending_pay and pending_pay.reference:
                try:
                    from core.utils.paystack import verify_transaction
                    from core.utils.fulfillment import fulfill_order
                    from django.utils import timezone
                    res = verify_transaction(pending_pay.reference)
                    if res.get('data', {}).get('status') == 'success':
                        payment = pending_pay
                        payment.status = 'SUCCESS'
                        payment.paid_at = timezone.now()
                        payment.channel = res['data'].get('channel', '')
                        payment.provider_data = res['data']
                        payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
                        fulfill_order(payment.order, payment=payment)
                except Exception:
                    pass

        # Self-healing: if searched by email, check any pending/cancelled payments for that email
        if email:
            pending_email_payments = Payment.objects.filter(
                Q(order__guest_email__iexact=email) | Q(order__attendee__user__email__iexact=email),
                status__in=['PENDING', 'FAILED']
            ).select_related('order')[:5]
            for payment in pending_email_payments:
                if payment.reference and payment.provider != 'FREE':
                    try:
                        from core.utils.paystack import verify_transaction
                        from core.utils.fulfillment import fulfill_order
                        from django.utils import timezone
                        res = verify_transaction(payment.reference)
                        if res.get('data', {}).get('status') == 'success':
                            payment.status = 'SUCCESS'
                            payment.paid_at = timezone.now()
                            payment.channel = res['data'].get('channel', '')
                            payment.provider_data = res['data']
                            payment.save(update_fields=['status', 'paid_at', 'channel', 'provider_data', 'updated_at'])
                            fulfill_order(payment.order, payment=payment)
                    except Exception:
                        pass

        orders = Order.objects.filter(
            order_filter,
            status='COMPLETED',
        ).select_related(
            'event', 'payment'
        ).annotate(
            ticket_count=Count('tickets', distinct=True)
        ).order_by('-created_at').distinct()[:10]

        results = []
        for order in orders:
            # Get representative ticket info
            first_ticket = order.tickets.select_related('ticket_type').first()
            ticket_type_name = first_ticket.ticket_type.name if first_ticket else 'Unknown'

            attendee_email = order.guest_email or (
                order.attendee.user.email if order.attendee else ''
            )
            attendee_name = order.guest_name or (
                order.attendee.user.get_full_name() if order.attendee else ''
            )

            payment_ref = ''
            try:
                payment_ref = order.payment.reference
            except Payment.DoesNotExist:
                pass

            results.append({
                'event_title': order.event.title,
                'ticket_type_name': ticket_type_name,
                'ticket_type': ticket_type_name,
                'attendee_name': attendee_name,
                'attendee_name_masked': mask_name(attendee_name),
                'attendee_email_masked': mask_email(attendee_email),
                'status': first_ticket.status if first_ticket else 'COMPLETED',
                'order_reference': payment_ref,
                'quantity': order.ticket_count,
                'ticket_count': order.ticket_count,
            })

        from api.serializers import FindTicketResultSerializer
        output = FindTicketResultSerializer(results, many=True)
        return Response(output.data)


class ResendTicketsView(APIView):
    """
    POST /api/tickets/resend/

    Re-sends the digital-ticket email for orders matched by the same criteria as
    Find My Ticket (reference, email or phone).

    Delivery uses exactly the purchase flow (`send_purchase_receipt`), so each
    ticket still goes only to the address it was issued to — the requester
    cannot redirect a ticket to an address of their choosing. Rate-limited.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendTicketRateThrottle]

    def post(self, request):
        from api.serializers import FindTicketRequestSerializer

        serializer = FindTicketRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        reference = data.get('reference', '').strip() or data.get('order_reference', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip() or data.get('phone_number', '').strip()

        order_filter = Q()
        if reference:
            order_filter |= Q(payment__reference__iexact=reference)
        if email:
            order_filter |= Q(guest_email__iexact=email)
            order_filter |= Q(attendee__user__email__iexact=email)
            order_filter |= Q(tickets__attendee_email__iexact=email)
        if phone:
            order_filter |= Q(guest_phone__icontains=phone)
            order_filter |= Q(attendee__phone_number__icontains=phone)

        if not order_filter:
            return Response(
                {'detail': 'No valid search criteria provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = list(
            Order.objects.filter(order_filter, status='COMPLETED')
            .select_related('event', 'attendee__user', 'payment')
            .prefetch_related('tickets')
            .order_by('-created_at')
            .distinct()[:5]
        )

        if not orders:
            return Response(
                {'detail': "We couldn't find a completed order with those details."},
                status=status.HTTP_404_NOT_FOUND,
            )

        sent = 0
        failed = 0
        recipients = []

        for order in orders:
            order_sent, order_failed, expected = resend_order_tickets(order)
            if not expected:
                continue
            sent += order_sent
            failed += order_failed
            recipients.extend(expected)

        if not recipients:
            return Response(
                {'detail': 'Those tickets have no delivery address on file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        masked = ', '.join(mask_email(address) for address in recipients[:5])

        if sent == 0:
            return Response(
                {
                    'detail': 'The email provider rejected the message. Try again in a minute.',
                    'sent': 0,
                    'failed': failed,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'detail': f'Ticket email resent to {masked}',
            'sent': sent,
            'failed': failed,
            'recipients': [mask_email(a) for a in recipients],
        })
