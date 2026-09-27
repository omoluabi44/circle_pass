from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from core.models import User, OrganizerProfile, Event, Payout, Order, OrganizerVerification, Ticket
from .permissions import IsAdmin
from core.utils.notifications import send_event_status_update, send_organizer_verification_update
from rest_framework import serializers

# Simple serializers for Admin
class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'date_joined')

class AdminOrganizerVerificationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='organizer.company_name', read_only=True)
    user_email = serializers.CharField(source='organizer.user.email', read_only=True)
    bio = serializers.CharField(source='organizer.bio', read_only=True)
    website = serializers.CharField(source='organizer.website', read_only=True)
    instagram_handle = serializers.CharField(source='organizer.instagram_handle', read_only=True)
    
    class Meta:
        model = OrganizerVerification
        fields = ('id', 'organizer', 'company_name', 'user_email', 'bio', 'website', 'instagram_handle', 'status', 'cac_document', 'id_document')

class AdminEventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.company_name', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'title', 'slug', 'description', 'cover_image', 'capacity', 'event_type', 'is_online', 'venue_name', 'country', 'state', 'city', 'status', 'organizer_name', 'start_time', 'end_time', 'organizer_contact', 'emergency_contact', 'age_restriction', 'dress_code')

class AdminPayoutSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='wallet.organizer.company_name', read_only=True)
    
    class Meta:
        model = Payout
        fields = ('id', 'wallet', 'organizer_name', 'amount', 'status')

# Views
class AdminOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, *args, **kwargs):
        total_users = User.objects.count()
        active_events = Event.objects.filter(status__in=['PUBLISHED', 'LIVE']).count()
        events_awaiting_review = Event.objects.filter(status='UNDER_REVIEW').count()
        
        pending_payouts_count = Payout.objects.filter(status='Pending').count()
        failed_payouts_count = Payout.objects.filter(status='Failed').count()
        
        total_tickets_sold = Ticket.objects.filter(status__in=['ISSUED', 'ACTIVE', 'USED']).count()
        total_ticket_scans = Ticket.objects.filter(status='USED').count()
        
        platform_revenue = Order.objects.filter(status='COMPLETED').aggregate(total=Sum('fee_amount'))['total'] or 0
        
        return Response({
            'total_users': total_users,
            'active_events': active_events,
            'events_awaiting_review': events_awaiting_review,
            'pending_payouts_count': pending_payouts_count,
            'failed_payouts_count': failed_payouts_count,
            'total_tickets_sold': total_tickets_sold,
            'total_ticket_scans': total_ticket_scans,
            'platform_revenue': platform_revenue,
        })

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer

class AdminOrganizerVerificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = OrganizerVerification.objects.all()
    serializer_class = AdminOrganizerVerificationSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        verif = self.get_object()
        verif.status = 'Verified'
        verif.save()
        
        # Mark profile as verified
        verif.organizer.is_verified = True
        verif.organizer.save()
        
        send_organizer_verification_update(verif)
        return Response({"status": "Verified"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        verif = self.get_object()
        verif.status = 'Rejected'
        verif.save()
        
        verif.organizer.is_verified = False
        verif.organizer.save()
        
        send_organizer_verification_update(verif)
        return Response({"status": "Rejected"})

class AdminEventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Event.objects.all().order_by('-id')
    serializer_class = AdminEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        event = self.get_object()
        event.status = 'PUBLISHED'
        event.save()
        send_event_status_update(event)
        return Response({"status": "PUBLISHED"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        event = self.get_object()
        event.status = 'REJECTED'
        event.save()
        send_event_status_update(event)
        return Response({"status": "REJECTED"})

class AdminPayoutViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Payout.objects.all().order_by('-id')
    serializer_class = AdminPayoutSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        payout = self.get_object()
        if payout.status == 'Pending':
            payout.status = 'Completed'
            payout.save()
            
            # Deduct from wallet's pending balance
            wallet = payout.wallet
            wallet.pending_balance -= payout.amount
            if wallet.pending_balance < 0:
                wallet.pending_balance = 0
            wallet.save()
            
            return Response({"status": "Completed"})
        return Response({"detail": "Payout is not pending"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        payout = self.get_object()
        if payout.status == 'Pending':
            payout.status = 'Rejected'
            payout.save()
            
            # Refund to available balance? Depending on exact logic. Let's just update status for now.
            return Response({"status": "Rejected"})
        return Response({"detail": "Payout is not pending"}, status=status.HTTP_400_BAD_REQUEST)
