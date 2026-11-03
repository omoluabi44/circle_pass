from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.response import Response

from api.permissions import IsOrganizerOrAdmin, is_admin_user
from core.models import EventCustomField, FollowedOrganizer, Ticket


class OrganizerContactsView(generics.ListAPIView):
    """
    GET /api/organizer/contacts/
    Returns a paginated list of all tickets sold across the organizer's events.

    Admins are not limited to events they own — they can browse any event by
    passing ?event_id=<id>, or every event at once.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.filter(order__status='COMPLETED')

        # Organizers only ever see their own events; admins see everything.
        if not is_admin_user(user):
            qs = qs.filter(order__event__organizer__user=user)

        # Optional filtering by event_id
        event_id = self.request.query_params.get('event_id')
        if event_id:
            qs = qs.filter(order__event_id=event_id)

        # Optional search across the details captured at checkout
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(attendee_name__icontains=search)
                | Q(attendee_email__icontains=search)
                | Q(qr_token__icontains=search)
                | Q(order__guest_name__icontains=search)
                | Q(order__guest_email__icontains=search)
                | Q(order__guest_phone__icontains=search)
                | Q(order__attendee__user__email__icontains=search)
                | Q(order__attendee__phone_number__icontains=search)
            )

        return qs.select_related(
            'order__event', 'order__attendee__user', 'ticket_type'
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

            return {
                "id": t.id,
                "name": name,
                "email": email,
                "phone": phone,
                "event_title": order.event.title,
                "ticket_type": t.ticket_type.name,
                "purchase_date": order.created_at,
                "status": t.status,
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
