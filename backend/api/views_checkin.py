from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import transaction
from django.db.models import Q

from core.models import Ticket, CheckIn, TeamMember
from core.utils.qr import verify_qr_token
from .permissions import IsOrganizerOrTeamMember

class CheckInScanView(APIView):
    """
    PassControl Check-in endpoint for organizers.
    Verifies the QR token securely and atomically transitions the ticket to USED.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrTeamMember]

    def post(self, request, *args, **kwargs):
        qr_token = request.data.get('qr_token')
        ticket_id = request.data.get('ticket_id')
        event_id = request.data.get('event_id')
        
        if not qr_token and not ticket_id:
            return Response({"detail": "QR token or ticket ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not event_id:
            return Response({"detail": "Event ID is required to verify ticket context."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Cryptographically verify the token (signature check) if using QR
        if qr_token and not verify_qr_token(qr_token):
            return Response({"detail": "Invalid or tampered QR token."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            # 2. Lookup the ticket and lock the row to prevent concurrent double-scanning
            try:
                if qr_token:
                    ticket = Ticket.objects.select_for_update().get(qr_token=qr_token)
                else:
                    ticket = Ticket.objects.select_for_update().get(pk=ticket_id)
            except Ticket.DoesNotExist:
                return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
                
            # Verify the ticket belongs to the specified event
            if str(ticket.order.event_id) != str(event_id):
                return Response({"detail": "Wrong Event: This ticket is for a different event."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Verify the user has permission to scan tickets for this event
            has_permission = False
            event_obj = ticket.order.event
            if event_obj.organizer.user == request.user or request.user.role == "ADMIN":
                has_permission = True
            else:
                # Check if user is an active team member for this organizer, either globally or specifically for this event
                has_permission = TeamMember.objects.filter(
                    user=request.user,
                    organizer=event_obj.organizer,
                    status='ACTIVE'
                ).filter(Q(event=event_obj) | Q(event__isnull=True)).exists()

            if not has_permission:
                return Response({"detail": "You do not have permission to scan tickets for this event."}, status=status.HTTP_403_FORBIDDEN)

            

            
            # 4. Check status and process transition
            scan_status = 'Invalid'
            http_status = status.HTTP_400_BAD_REQUEST
            response_detail = ""
            
            if ticket.status == 'USED':
                scan_status = 'Already Used'
                response_detail = "This ticket has already been used."
            elif ticket.status == 'EXPIRED':
                scan_status = 'Expired'
                response_detail = "This ticket has expired."
            elif ticket.status == 'INVALIDATED':
                scan_status = 'Invalid'
                response_detail = "This ticket is invalidated."

            elif ticket.status == 'ACTIVE':
                # Success path
                ticket.status = 'USED'
                ticket.save(update_fields=['status'])
                scan_status = 'Valid'
                http_status = status.HTTP_200_OK
                response_detail = "Ticket successfully checked in."
            elif ticket.status == 'PENDING':
                scan_status = 'Invalid'
                response_detail = "This ticket is pending payment."
                
            # Create Audit Record
            CheckIn.objects.create(
                ticket=ticket,
                status=scan_status,
                scanned_by=request.user
            )
            
            return Response({
                "status": scan_status,
                "detail": response_detail,
                "ticket_tier": ticket.ticket_type.name,
                "attendee_name": ticket.attendee_name
            }, status=http_status)


from django.db.models import Q, Count
from .serializers import TicketSerializer

class CheckInManualSearchView(APIView):
    """
    Manual search for tickets by name, email, or token string.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrTeamMember]

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        query = request.query_params.get('q', '').strip()

        if not event_id:
            return Response({"detail": "event_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.shortcuts import get_object_or_404
        from core.models import Event
        
        # Check permissions for this event
        event_obj = get_object_or_404(Event, id=event_id)
        if event_obj.organizer.user != request.user and request.user.role != "ADMIN":
            has_permission = TeamMember.objects.filter(
                user=request.user,
                organizer=event_obj.organizer,
                status='ACTIVE'
            ).filter(Q(event=event_obj) | Q(event__isnull=True)).exists()
            if not has_permission:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Basic search
        tickets = Ticket.objects.filter(order__event_id=event_id)

        if query:
            tickets = tickets.filter(
                Q(attendee_name__icontains=query) |
                Q(attendee_email__icontains=query) |
                Q(qr_token__icontains=query)
            )

        # Limit to 20 for performance
        tickets = tickets[:20]

        # Use existing ticket serializer or just return raw data
        data = [{
            "id": t.id,
            "attendee_name": t.attendee_name,
            "attendee_email": t.attendee_email,
            "status": t.status,
            "ticket_type": t.ticket_type.name,
            "qr_token_snippet": t.qr_token[:8] + "..."
        } for t in tickets]

        return Response(data, status=status.HTTP_200_OK)


class CheckInStatsView(APIView):
    """
    Live scan feed and statistics.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizerOrTeamMember]

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        
        if not event_id:
            return Response({"detail": "event_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.shortcuts import get_object_or_404
        from core.models import Event
        
        # Check permissions for this event
        event_obj = get_object_or_404(Event, id=event_id)
        if event_obj.organizer.user != request.user and request.user.role != "ADMIN":
            has_permission = TeamMember.objects.filter(
                user=request.user,
                organizer=event_obj.organizer,
                status='ACTIVE'
            ).filter(Q(event=event_obj) | Q(event__isnull=True)).exists()
            if not has_permission:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Base tickets queryset
        tickets_qs = Ticket.objects.filter(order__event_id=event_id)

        # Stats requested by user:
        # Total Passes (Total issued)
        total_tickets = tickets_qs.filter(status__in=['ISSUED', 'ACTIVE', 'USED']).count()
        # Active/Unused Passes
        active_passes = tickets_qs.filter(status__in=['ISSUED', 'ACTIVE']).count()
        # Checked-in Passes
        checked_in = tickets_qs.filter(status='USED').count()
        # Remaining Passes (Same as active_passes conceptually, but we can return it as requested)
        remaining = total_tickets - checked_in
        # Check-in Rate
        check_in_rate = (checked_in / total_tickets * 100) if total_tickets > 0 else 0

        # Recent scans (CheckIn objects)
        recent_checkins = CheckIn.objects.filter(
            ticket__order__event_id=event_id
        ).select_related('ticket__ticket_type', 'scanned_by').order_by('-scanned_at')[:20]

        recent_data = [{
            "id": c.id,
            "attendee_name": c.ticket.attendee_name,
            "ticket_type": c.ticket.ticket_type.name,
            "status": c.status,
            "scanned_at": c.scanned_at,
            "scanned_by_name": (c.scanned_by.get_full_name().strip() or c.scanned_by.username or c.scanned_by.email) if c.scanned_by else "System"
        } for c in recent_checkins]

        return Response({
            "total_tickets": total_tickets,
            "active_passes": active_passes,
            "checked_in": checked_in,
            "remaining": remaining,
            "percentage": check_in_rate,
            "recent_scans": recent_data
        }, status=status.HTTP_200_OK)
