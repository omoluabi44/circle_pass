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

        reference = data.get('reference', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()

        # Build query across orders
        order_filter = Q()

        if reference:
            # Search by payment reference
            order_filter |= Q(payment__reference__iexact=reference)

        if email:
            # Search by guest email or attendee email
            order_filter |= Q(guest_email__iexact=email)
            order_filter |= Q(attendee__user__email__iexact=email)

        if phone:
            # Phone isn't stored on Order directly; search ticket attendee fields
            # For now, we'll skip phone (no phone field on model) and return empty
            pass

        if not order_filter:
            return Response(
                {'detail': 'No valid search criteria provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = Order.objects.filter(
            order_filter,
            status='COMPLETED',
        ).select_related(
            'event', 'payment'
        ).annotate(
            ticket_count=Count('tickets')
        ).order_by('-created_at')[:10]

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
                'attendee_name_masked': mask_name(attendee_name),
                'attendee_email_masked': mask_email(attendee_email),
                'status': order.status,
                'order_reference': payment_ref,
                'ticket_count': order.ticket_count,
            })

        from api.serializers import FindTicketResultSerializer
        output = FindTicketResultSerializer(results, many=True)
        return Response(output.data)
