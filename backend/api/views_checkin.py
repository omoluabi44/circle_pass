from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from core.models import Ticket, CheckIn
from core.utils.qr import verify_qr_token
from .permissions import IsOrganizer

class CheckInScanView(APIView):
    """
    PassControl Check-in endpoint for organizers.
    Verifies the QR token securely and atomically transitions the ticket to USED.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

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
                
            # Verify the organizer owns this event
            if ticket.order.event.organizer.user != request.user:
                return Response({"detail": "You do not have permission to scan tickets for this event."}, status=status.HTTP_403_FORBIDDEN)
            
            # 3. Apply lazy activation just in case it wasn't triggered yet
            if ticket.status == 'ISSUED':
                activation_threshold = ticket.order.event.start_time - timedelta(hours=3)
                if timezone.now() >= activation_threshold:
                    ticket.status = 'ACTIVE'
                    ticket.save(update_fields=['status'])
            
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
            elif ticket.status == 'ISSUED':
                scan_status = 'Invalid'
                response_detail = "This ticket is not yet active (activates 3 hours before event)."
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
                status=scan_status
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
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        query = request.query_params.get('q', '').strip()

        if not event_id:
            return Response({"detail": "event_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic search
        tickets = Ticket.objects.filter(order__event_id=event_id, order__event__organizer__user=request.user)

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
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        
        if not event_id:
            return Response({"detail": "event_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Stats
        total_tickets = Ticket.objects.filter(
            order__event_id=event_id, 
            order__event__organizer__user=request.user,
            status__in=['ISSUED', 'ACTIVE', 'USED']
        ).count()
        
        checked_in = Ticket.objects.filter(
            order__event_id=event_id,
            order__event__organizer__user=request.user,
            status='USED'
        ).count()

        # Recent scans (CheckIn objects)
        recent_checkins = CheckIn.objects.filter(
            ticket__order__event_id=event_id,
            ticket__order__event__organizer__user=request.user
        ).order_by('-scanned_at')[:20]

        recent_data = [{
            "id": c.id,
            "attendee_name": c.ticket.attendee_name,
            "ticket_type": c.ticket.ticket_type.name,
            "status": c.status,
            "scanned_at": c.scanned_at,
        } for c in recent_checkins]

        return Response({
            "total_tickets": total_tickets,
            "checked_in": checked_in,
            "remaining": total_tickets - checked_in,
            "percentage": (checked_in / total_tickets * 100) if total_tickets > 0 else 0,
            "recent_scans": recent_data
        }, status=status.HTTP_200_OK)
