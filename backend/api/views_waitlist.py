import logging
import secrets
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Event, TicketType, Order, OrderItem, WaitlistEntry
from api.serializers import WaitlistEntrySerializer
from core.utils.notifications import (
    send_waitlist_organizer_notification,
    send_waitlist_accepted_notification,
)

logger = logging.getLogger(__name__)


def _is_event_sold_out(event):
    """
    Returns True if every ticket type for the event is sold out or event has no capacity.
    """
    tts = event.ticket_types.filter(is_active=True)
    if not tts.exists():
        return True
    return all(
        tt.is_sold_out or (tt.quantity > 0 and (tt.quantity_sold or 0) >= tt.quantity)
        for tt in tts
    )


class WaitlistEntryCreateView(APIView):
    """
    POST /api/events/<event_id>/waitlist/
    Allows attendees to join the waitlist for a sold-out event.
    Attendee specifies ticket_type, quantity, name, email, and phone.
    No payment or card is required upon joining.
    """
    permission_classes = [AllowAny]

    def post(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not event.waitlist_enabled:
            return Response(
                {'detail': 'Waitlist is not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Attendee Rule: Waitlist appears only when all event ticket categories are sold out.
        if not _is_event_sold_out(event):
            return Response(
                {'detail': 'Tickets are still available for this event. Waitlist is only open when sold out.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        phone = request.data.get('phone', '').strip()
        ticket_type_id = request.data.get('ticket_type_id') or request.data.get('ticket_type')

        try:
            quantity = int(request.data.get('quantity', 1))
            if quantity < 1:
                quantity = 1
        except (ValueError, TypeError):
            quantity = 1

        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not name:
            return Response({'detail': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate ticket tier if provided
        ticket_type = None
        if ticket_type_id:
            try:
                ticket_type = event.ticket_types.get(pk=ticket_type_id)
            except TicketType.DoesNotExist:
                return Response({'detail': 'Selected ticket category is invalid for this event.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Fallback to first available active tier if not explicitly specified
            ticket_type = event.ticket_types.filter(is_active=True).first()

        # Prevent duplicate active requests for the same email and ticket type
        existing_active = WaitlistEntry.objects.filter(
            event=event,
            email=email,
            ticket_type=ticket_type,
            status__in=['PENDING', 'ACCEPTED']
        ).first()

        if existing_active:
            if existing_active.status == 'ACCEPTED':
                return Response(
                    {'detail': 'Your previous request has already been accepted! Please check your email for the payment link.'},
                    status=status.HTTP_200_OK
                )
            return Response(
                {'detail': 'You already have a pending waitlist request for this ticket category.'},
                status=status.HTTP_200_OK
            )

        token = secrets.token_urlsafe(32)
        entry = WaitlistEntry.objects.create(
            event=event,
            ticket_type=ticket_type,
            name=name,
            email=email,
            phone=phone,
            quantity=quantity,
            status='PENDING',
            access_token=token,
        )

        # Notify the organizer that a new request arrived
        try:
            send_waitlist_organizer_notification(entry)
        except Exception as e:
            logger.warning(f"Failed to send organizer waitlist email for event {event_id}: {e}")

        return Response({
            'detail': 'Successfully joined the waitlist! You will be notified if your request is accepted.',
            'entry_id': entry.id,
            'status': entry.status,
            'ticket_type': ticket_type.name if ticket_type else 'General',
            'quantity': quantity
        }, status=status.HTTP_201_CREATED)


class OrganizerWaitlistListView(APIView):
    """
    GET /api/events/<event_id>/waitlist/manage/
    Allows the organizer to view all waitlist entries for their event.
    Returns requested categories, quantities, contact details, and current inventory.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Ownership validation
        user = request.user
        if not (user.is_staff or getattr(event.organizer, 'user', None) == user):
            return Response({'detail': 'You do not have permission to view waitlist for this event.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status')
        queryset = WaitlistEntry.objects.filter(event=event).select_related('ticket_type', 'order')

        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        queryset = queryset.order_by('created_at')

        serializer = WaitlistEntrySerializer(queryset, many=True)

        # Aggregate counts
        all_entries = WaitlistEntry.objects.filter(event=event)
        counts = {
            'total': all_entries.count(),
            'pending': all_entries.filter(status='PENDING').count(),
            'accepted': all_entries.filter(status='ACCEPTED').count(),
            'declined': all_entries.filter(status='DECLINED').count(),
            'expired': all_entries.filter(status='EXPIRED').count(),
            'completed': all_entries.filter(status='COMPLETED').count(),
        }

        # Available inventory summary per ticket tier
        tiers_inventory = []
        for tt in event.ticket_types.all():
            available = max(0, tt.quantity - tt.quantity_sold)
            tiers_inventory.append({
                'id': tt.id,
                'name': tt.name,
                'tier': tt.tier,
                'price': tt.price,
                'quantity': tt.quantity,
                'quantity_sold': tt.quantity_sold,
                'available': available,
                'is_sold_out': tt.is_sold_out or available <= 0
            })

        return Response({
            'counts': counts,
            'entries': serializer.data,
            'tiers_inventory': tiers_inventory,
            'waitlist_enabled': event.waitlist_enabled
        })


class OrganizerWaitlistAcceptView(APIView):
    """
    POST /api/events/<event_id>/waitlist/<entry_id>/accept/
    Organizer manually approves a waitlist request.
    Enforces strict rule:
    Organizer CANNOT accept a request if requested ticket category/quantity is not actually available.
    If available:
    - Reserves the requested tickets atomically.
    - Creates a pending Order with expiration window (2 hours).
    - Sends acceptance notification email with checkout link to attendee.
    - Sets entry status to ACCEPTED.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id, entry_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not (user.is_staff or getattr(event.organizer, 'user', None) == user):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            with transaction.atomic():
                entry = WaitlistEntry.objects.select_for_update().get(pk=entry_id, event=event)

                if entry.status != 'PENDING':
                    return Response(
                        {'detail': f'Cannot accept: this request is already {entry.status.lower()}.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if not entry.ticket_type:
                    return Response(
                        {'detail': 'This waitlist entry does not have an associated ticket tier.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Lock ticket type row for atomic oversell protection
                ticket_type = TicketType.objects.select_for_update().get(pk=entry.ticket_type_id)
                available = ticket_type.quantity - ticket_type.quantity_sold

                # If available is less than requested, check if organizer chose to auto-increase capacity
                if available < entry.quantity:
                    auto_increase = request.data.get('auto_increase_capacity', False)
                    if auto_increase:
                        needed = entry.quantity - available
                        TicketType.objects.filter(pk=ticket_type.pk).update(quantity=F('quantity') + needed)
                        ticket_type.refresh_from_db()
                        available = ticket_type.quantity - ticket_type.quantity_sold
                    else:
                        return Response({
                            'detail': f'Cannot accept request: only {available} {ticket_type.name} ticket(s) available (requested: {entry.quantity}). Increase ticket capacity to accept.',
                            'requires_capacity_increase': True,
                            'available': available,
                            'needed': entry.quantity - available
                        }, status=status.HTTP_400_BAD_REQUEST)

                # Compute pricing & fees for reservation
                subtotal = ticket_type.price * entry.quantity
                fee_amount = 0
                if subtotal > 0 and not event.absorb_fees:
                    fee_amount = int(subtotal * 0.05)
                total_amount = subtotal + fee_amount

                # Reservation checkout window: 2 hours (7200 seconds)
                reservation_expiry = timezone.now() + timedelta(hours=2)

                # Create pending reservation Order
                order = Order.objects.create(
                    guest_email=entry.email,
                    guest_name=entry.name,
                    guest_phone=entry.phone,
                    event=event,
                    subtotal=subtotal,
                    discount_amount=0,
                    fee_amount=fee_amount,
                    total_amount=total_amount,
                    status='PENDING',
                    expires_at=reservation_expiry
                )

                OrderItem.objects.create(
                    order=order,
                    ticket_type=ticket_type,
                    quantity=entry.quantity,
                    unit_price=ticket_type.price,
                    line_total=subtotal
                )

                # Atomically decrement available inventory by marking quantity_sold
                ticket_type.quantity_sold = F('quantity_sold') + entry.quantity
                ticket_type.save(update_fields=['quantity_sold'])

                # Update Waitlist Entry
                if not entry.access_token:
                    entry.access_token = secrets.token_urlsafe(32)

                entry.status = 'ACCEPTED'
                entry.order = order
                entry.reserved_until = reservation_expiry
                entry.notified = True
                entry.notified_at = timezone.now()
                entry.save()

                # Schedule automatic order expiration / release task
                try:
                    from .tasks import expire_pending_order
                    expire_pending_order.apply_async((order.id,), countdown=7200)
                except Exception as e:
                    logger.warning(f"Could not queue expire_pending_order task: {e}")

                # Send email notification to attendee
                try:
                    send_waitlist_accepted_notification(entry)
                except Exception as e:
                    logger.error(f"Failed to send waitlist acceptance email to {entry.email}: {e}")

                return Response({
                    'detail': f'Request accepted! {entry.quantity} {ticket_type.name} ticket(s) have been reserved and attendee notified.',
                    'entry': WaitlistEntrySerializer(entry).data
                }, status=status.HTTP_200_OK)

        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Waitlist entry not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error accepting waitlist entry {entry_id}: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrganizerWaitlistDeclineView(APIView):
    """
    POST /api/events/<event_id>/waitlist/<entry_id>/decline/
    Organizer declines a waitlist request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id, entry_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not (user.is_staff or getattr(event.organizer, 'user', None) == user):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            entry = WaitlistEntry.objects.get(pk=entry_id, event=event)
            if entry.status != 'PENDING':
                return Response(
                    {'detail': f'Cannot decline: request is currently {entry.status.lower()}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            entry.status = 'DECLINED'
            entry.save(update_fields=['status', 'updated_at'])

            return Response({
                'detail': 'Waitlist request declined.',
                'entry': WaitlistEntrySerializer(entry).data
            }, status=status.HTTP_200_OK)

        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Waitlist entry not found.'}, status=status.HTTP_404_NOT_FOUND)


class WaitlistClaimView(APIView):
    """
    GET /api/events/<event_id>/waitlist/claim/?token=<access_token>
    Validates an attendee's waitlist token and retrieves reserved checkout information.
    If the reservation expired, releases the inventory and updates status to EXPIRED.
    """
    permission_classes = [AllowAny]

    def get(self, request, event_id):
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'detail': 'Claim token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            entry = WaitlistEntry.objects.select_related('event', 'ticket_type', 'order').get(
                access_token=token,
                event_id=event_id
            )
        except WaitlistEntry.DoesNotExist:
            return Response({'detail': 'Invalid or expired reservation token.'}, status=status.HTTP_404_NOT_FOUND)

        # Check expiration
        now = timezone.now()
        if entry.status == 'ACCEPTED' and entry.reserved_until and now > entry.reserved_until:
            with transaction.atomic():
                entry.status = 'EXPIRED'
                entry.save(update_fields=['status', 'updated_at'])
                if entry.order and entry.order.status == 'PENDING':
                    entry.order.status = 'CANCELLED'
                    entry.order.save(update_fields=['status'])
                    if entry.ticket_type:
                        TicketType.objects.filter(pk=entry.ticket_type_id).update(
                            quantity_sold=F('quantity_sold') - entry.quantity
                        )

            return Response({
                'detail': 'Your reservation has expired and the tickets have been released back to inventory.',
                'status': 'EXPIRED'
            }, status=status.HTTP_410_GONE)

        if entry.status == 'COMPLETED':
            return Response({
                'detail': 'This reservation has already been claimed and paid.',
                'status': 'COMPLETED'
            }, status=status.HTTP_200_OK)

        if entry.status != 'ACCEPTED':
            return Response({
                'detail': f'This reservation is no longer active (status: {entry.status}).',
                'status': entry.status
            }, status=status.HTTP_400_BAD_REQUEST)

        # Calculate time remaining
        seconds_left = max(0, int((entry.reserved_until - now).total_seconds())) if entry.reserved_until else 0

        return Response({
            'status': entry.status,
            'entry_id': entry.id,
            'token': entry.access_token,
            'attendee_name': entry.name,
            'attendee_email': entry.email,
            'attendee_phone': entry.phone,
            'ticket_type_id': entry.ticket_type_id,
            'ticket_type_name': entry.ticket_type.name if entry.ticket_type else 'General',
            'ticket_type_tier': entry.ticket_type.tier if entry.ticket_type else 'REGULAR',
            'ticket_price': entry.ticket_type.price if entry.ticket_type else 0,
            'quantity': entry.quantity,
            'subtotal': (entry.ticket_type.price if entry.ticket_type else 0) * entry.quantity,
            'order_id': entry.order_id,
            'reserved_until': entry.reserved_until,
            'seconds_left': seconds_left,
        })
