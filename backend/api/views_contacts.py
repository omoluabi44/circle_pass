from rest_framework import generics, permissions
from rest_framework.response import Response
from api.permissions import IsOrganizerOrAdmin
from core.models import Ticket

class OrganizerContactsView(generics.ListAPIView):
    """
    GET /api/organizer/contacts/
    Returns a paginated list of all tickets sold across the organizer's events.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.filter(
            order__event__organizer__user=user,
            order__status='COMPLETED'
        )
        qs = qs.select_related('order__event', 'ticket_type').order_by('-order__created_at')

        # Optional filtering by event_id
        event_id = self.request.query_params.get('event_id')
        if event_id:
            qs = qs.filter(order__event_id=event_id)

        # Optional search
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                attendee_name__icontains=search
            ) | qs.filter(
                attendee_email__icontains=search
            ) | qs.filter(
                qr_token__icontains=search
            )
            
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        # Serialize the tickets to match the frontend expectations
        def serialize_ticket(t):
            return {
                "id": t.id,
                "name": t.attendee_name,
                "email": t.attendee_email,
                "event_title": t.order.event.title,
                "ticket_type": t.ticket_type.name,
                "purchase_date": t.order.created_at,
                "status": t.status,
            }

        if page is not None:
            data = [serialize_ticket(t) for t in page]
            return self.get_paginated_response(data)

        data = [serialize_ticket(t) for t in queryset]
        return Response(data)

from core.models import FollowedOrganizer

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
