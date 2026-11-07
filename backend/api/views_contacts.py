from django.db.models import Count, Max, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsOrganizerOrAdmin, is_admin_user
from core.models import Event, EventCustomField, FollowedOrganizer, Ticket


def organizer_events_for(user, all_events=False):
    """Events the user can see on the contacts screen (own events; all only if explicitly requested by admin)."""
    if all_events and is_admin_user(user):
        return Event.objects.all()
    return Event.objects.filter(organizer__user=user)


class OrganizerContactEventsView(APIView):
    """
    GET /api/organizer/contacts/events/

    Every event this organizer has ever created, with ticket totals, so the
    Audience screen can offer an event picker even for events with no sales.
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get(self, request):
        all_events = request.query_params.get("all_events") == "true" and is_admin_user(request.user)
        events = organizer_events_for(request.user, all_events=all_events).annotate(
            tickets_sold=Count(
                'orders__tickets',
                filter=Q(orders__status='COMPLETED'),
                distinct=True,
            ),
            checked_in=Count(
                'orders__tickets',
                filter=Q(orders__status='COMPLETED', orders__tickets__status='USED'),
                distinct=True,
            ),
        ).order_by('-start_time', '-id')

        return Response([
            {
                'id': event.id,
                'title': event.title,
                'slug': event.slug,
                'status': event.status,
                'start_time': event.start_time,
                'tickets_sold': event.tickets_sold,
                'checked_in': event.checked_in,
            }
            for event in events
        ])


class OrganizerContactsView(generics.ListAPIView):
    """
    GET /api/organizer/contacts/
    Returns every ticket sold across the organizer's events.

    Optional query params:
      event_id  — restrict to one event (used by the per-event Attendees page)
      status    — USED for checked in, NOT_USED for everyone else
      code      — only tickets from orders that used this discount/referral code
      search    — name, email, phone, order id/reference, QR token or event title

    Admins are not limited to events they own — they can browse any event by
    passing ?event_id=<id>, or every event at once.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.filter(order__status='COMPLETED')

        # Organizers only see tickets for events they created.
        # An admin only sees all platform events if explicitly requesting all_events=true.
        all_events = (self.request.query_params.get("all_events") == "true") and is_admin_user(user)
        if not all_events:
            qs = qs.filter(order__event__organizer__user=user)

        # Optional filtering by event_id
        event_id = self.request.query_params.get('event_id')
        if event_id:
            qs = qs.filter(order__event_id=event_id)

        # Optional filter: only orders that used a discount/referral code
        code = (self.request.query_params.get('code') or '').strip()
        if code:
            qs = qs.filter(
                Q(order__discount_redemptions__discount__code__iexact=code)
                | Q(order__referral_code__iexact=code)
            ).distinct()

        # Optional check-in status filter
        ticket_status = (self.request.query_params.get('status') or '').strip().upper()
        if ticket_status == 'USED':
            qs = qs.filter(status='USED')
        elif ticket_status in ('NOT_USED', 'UNUSED'):
            qs = qs.exclude(status='USED')
        elif ticket_status:
            qs = qs.filter(status=ticket_status)

        # Optional search across the details captured at checkout
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            search_filter = (
                Q(attendee_name__icontains=search)
                | Q(attendee_email__icontains=search)
                | Q(qr_token__icontains=search)
                | Q(order__guest_name__icontains=search)
                | Q(order__guest_email__icontains=search)
                | Q(order__guest_phone__icontains=search)
                | Q(order__attendee__user__email__icontains=search)
                | Q(order__attendee__phone_number__icontains=search)
                | Q(order__event__title__icontains=search)
                | Q(order__payment__reference__icontains=search)
            )
            if search.isdigit():
                search_filter |= Q(order_id=int(search))
            qs = qs.filter(search_filter)

        return qs.select_related(
            'order__event', 'order__attendee__user', 'order__payment', 'ticket_type'
        ).annotate(
            checked_in_at=Max('checkins__scanned_at')
        ).order_by('-order__created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        # Cache custom-field label maps per event: {"<field id>": label, "label": label}
        label_cache = {}

        def labels_for(event_id):
            if event_id not in label_cache:
                mapping = {}
                for field in EventCustomField.objects.filter(event_id=event_id):
                    mapping[str(field.id)] = field.label
                    mapping[field.label] = field.label
                label_cache[event_id] = mapping
            return label_cache[event_id]

        def resolve_custom_fields(order):
            """Turn {field_id: value} into {label: value} for display/export."""
            raw = order.custom_field_responses or {}
            if not isinstance(raw, dict):
                return {}
            mapping = labels_for(order.event_id)
            resolved = {}
            for key, value in raw.items():
                if value is None or value == '':
                    continue
                resolved[mapping.get(str(key), str(key))] = value
            return resolved

        def serialize_ticket(t):
            order = t.order
            attendee = order.attendee
            attendee_user = attendee.user if attendee and attendee.user_id else None

            name = (
                t.attendee_name
                or order.guest_name
                or (attendee_user.get_full_name() if attendee_user else '')
                or ''
            ).strip()
            email = (
                t.attendee_email
                or order.guest_email
                or (attendee_user.email if attendee_user else '')
                or ''
            ).strip()
            phone = (
                order.guest_phone
                or (attendee.phone_number if attendee else '')
                or ''
            ).strip()

            payment = getattr(order, 'payment', None)

            return {
                "id": t.id,
                "name": name,
                "email": email,
                "phone": phone,
                "event_id": order.event_id,
                "event_title": order.event.title,
                "event_slug": order.event.slug,
                "event_status": order.event.status,
                "order_id": order.id,
                "order_reference": payment.reference if payment else "",
                "ticket_type": t.ticket_type.name,
                "purchase_date": order.created_at,
                "status": t.status,
                "checked_in_at": getattr(t, 'checked_in_at', None),
                "custom_field_responses": resolve_custom_fields(order),
            }

        if page is not None:
            data = [serialize_ticket(t) for t in page]
            return self.get_paginated_response(data)

        data = [serialize_ticket(t) for t in queryset]
        return Response(data)


class OrganizerFollowersView(generics.ListAPIView):
    """
    GET /api/organizer/followers/
    Returns a list of users following this organizer.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = FollowedOrganizer.objects.filter(organizer__user=user)
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(user__first_name__icontains=search) | qs.filter(user__last_name__icontains=search) | qs.filter(user__email__icontains=search)
            
        return qs.select_related('user').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        def serialize_follower(f):
            return {
                "id": f.id,
                "name": f"{f.user.first_name} {f.user.last_name}".strip() or f.user.username or "Anonymous",
                "email": f.user.email,
                "followed_at": f.created_at,
            }

        if page is not None:
            data = [serialize_follower(f) for f in page]
            return self.get_paginated_response(data)

        data = [serialize_follower(f) for f in queryset]
        return Response(data)
