from rest_framework import viewsets, permissions
from django.utils import timezone
from datetime import timedelta
from core.models import Ticket
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
        qs = Ticket.objects.filter(order__attendee__user=user)

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
        from django.shortcuts import get_object_or_404
        from django.db.models import Q
        
        obj = get_object_or_404(queryset, Q(qr_token=lookup) | Q(pk=lookup) if lookup.isdigit() else Q(qr_token=lookup))
        self.check_object_permissions(self.request, obj)
        return obj
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

class PublicTicketView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, qr_token):
        ticket = get_object_or_404(Ticket, qr_token=qr_token)
        
        # 3-hour Pre-Event Activation Logic (Lazy Evaluation)
        activation_threshold = timezone.now() + timedelta(hours=3)
        if ticket.status == 'ISSUED' and ticket.order.event.start_time <= activation_threshold:
            ticket.status = 'ACTIVE'
            ticket.save(update_fields=['status'])
            
        serializer = TicketSerializer(ticket, context={'request': request})
        return Response(serializer.data)
