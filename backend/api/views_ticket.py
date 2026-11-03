from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from api.permissions import user_can_view_ticket
from core.models import Order, Payment, Ticket
from .serializers import TicketSerializer


class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Retrieves the digital tickets for the authenticated attendee.
    Applies lazy evaluation to activate tickets within 3 hours of the event start time.
    """
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        user = self.request.user
        # Tickets bought with an account, plus guest purchases made with the
        # same email address (verified at sign-up), so guests who later
        # register can manage their passes too.
        conditions = Q(order__attendee__user=user)
        email = (user.email or '').strip()
        if email:
            conditions |= Q(order__guest_email__iexact=email)
        qs = Ticket.objects.filter(conditions)

        # 7-day Pre-Event Activation Logic (Lazy Evaluation)
        activation_threshold = timezone.now() + timedelta(days=7)

        # Atomically bulk update tickets that have crossed the threshold
        qs_to_activate = qs.filter(
            status='ISSUED',
            order__event__start_time__lte=activation_threshold
        )
        if qs_to_activate.exists():
            qs_to_activate.update(status='ACTIVE')

        # Order by newest first
        return qs.order_by('-created_at')

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup = self.kwargs.get(self.lookup_field)

        # Try to look up by qr_token first, then fallback to pk
        obj = get_object_or_404(queryset, Q(qr_token=lookup) | Q(pk=lookup) if lookup.isdigit() else Q(qr_token=lookup))
        self.check_object_permissions(self.request, obj)
        return obj


class PublicTicketView(APIView):
    """
    GET /api/tickets/public/<qr_token>/

    The shareable pass link. Requires authentication, and only the ticket
    owner (the account behind the buyer's email), the organizer of that
    event, or an admin may read it.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, qr_token):
        ticket = get_object_or_404(
            Ticket.objects.select_related(
                'order__event__organizer__user',
                'order__attendee__user',
                'ticket_type',
            ),
            qr_token=qr_token,
        )

        if not user_can_view_ticket(request.user, ticket):
            return Response(
                {'detail': 'You do not have access to this ticket.'},
                status=403,
            )

        # 3-hour Pre-Event Activation Logic (Lazy Evaluation)
        activation_threshold = timezone.now() + timedelta(hours=3)
        if ticket.status == 'ISSUED' and ticket.order.event.start_time <= activation_threshold:
            ticket.status = 'ACTIVE'
            ticket.save(update_fields=['status'])

        serializer = TicketSerializer(ticket, context={'request': request})
        return Response(serializer.data)


class TicketAccessView(APIView):
    """
    POST /api/tickets/access/

    Turns the details someone searched with on "Find My Ticket" into pass
    links, but only for tickets the caller is allowed to view. The public
    find-ticket response never carries QR tokens, so the frontend asks this
    authenticated endpoint for them after the user signs in.

    Body: { "order_reference": "...", "email": "...", "phone_number": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = (request.data.get('order_reference') or request.data.get('reference') or '').strip()
        email = (request.data.get('email') or '').strip()
        phone = (request.data.get('phone_number') or request.data.get('phone') or '').strip()

        if not any([reference, email, phone]):
            return Response(
                {'detail': 'Provide an order reference, email address or phone number.'},
                status=400,
            )

        orders = Order.objects.filter(status='COMPLETED')

        criteria = Q()
        if reference:
            criteria |= Q(payment__reference__iexact=reference)
        if email:
            criteria |= Q(guest_email__iexact=email)
            criteria |= Q(attendee__user__email__iexact=email)
        if phone:
            criteria |= Q(guest_phone__icontains=phone)
            criteria |= Q(attendee__phone_number__icontains=phone)

        matched_orders = list(
            orders.filter(criteria).select_related('event')[:20]
        )

        if not matched_orders:
            return Response({'detail': 'No tickets found for those details.'}, status=404)

        tickets = Ticket.objects.filter(
            order__in=matched_orders
        ).select_related(
            'order__event__organizer__user',
            'order__attendee__user',
            'order__payment',
            'ticket_type',
        ).order_by('id')

        visible = [t for t in tickets if user_can_view_ticket(request.user, t)]

        if not visible:
            return Response(
                {'detail': 'You do not have access to these tickets. Sign in with the email address used to buy them.'},
                status=403,
            )

        def order_reference(order):
            try:
                return order.payment.reference
            except Payment.DoesNotExist:
                return ''

        return Response({
            'tickets': [
                {
                    'id': t.id,
                    'qr_token': t.qr_token,
                    'order_reference': order_reference(t.order),
                    'event_title': t.order.event.title,
                    'ticket_type_name': t.ticket_type.name,
                    'attendee_name': t.attendee_name,
                    'status': t.status,
                }
                for t in visible
            ]
        })
