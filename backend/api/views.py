from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from djoser.views import UserViewSet
from djoser import utils
from django.contrib.auth.tokens import default_token_generator
from core.models import OrganizerProfile, User
from .serializers import OrganizerProfileSerializer
from .permissions import IsOrganizer, IsAttendee, IsOrganizerOrAdmin
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    email = request.data.get('email')
    role = request.data.get('role', 'ATTENDEE')
    
    if role not in ['ATTENDEE', 'ORGANIZER']:
        role = 'ATTENDEE'
        
    if not email:
        return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    user, created = User.objects.get_or_create(email=email, defaults={
        'username': email.split('@')[0],
        'role': role,
        'is_active': True
    })
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'role': user.role,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })

class CustomUserViewSet(UserViewSet):
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            user = User.objects.get(id=response.data['id'])
            uid = utils.encode_uid(user.pk)
            token = default_token_generator.make_token(user)
            activation_url = f"https://thecirclepass.com/verify-email/{uid}/{token}"
            response.data['activation_url'] = activation_url
        return response

    from rest_framework.decorators import action
    @action(["post"], detail=False)
    def resend_activation(self, request, *args, **kwargs):
        response = super().resend_activation(request, *args, **kwargs)
        if response.status_code == 204:
            email = request.data.get("email")
            user = User.objects.get(email=email)
            uid = utils.encode_uid(user.pk)
            token = default_token_generator.make_token(user)
            activation_url = f"https://thecirclepass.com/verify-email/{uid}/{token}"
            return Response({"message": "Activation resent", "activation_url": activation_url}, status=status.HTTP_200_OK)
        return response

    @action(["post"], detail=False)
    def reset_password(self, request, *args, **kwargs):
        response = super().reset_password(request, *args, **kwargs)
        if response.status_code == 204:
            email = request.data.get("email")
            try:
                user = User.objects.get(email=email)
                uid = utils.encode_uid(user.pk)
                token = default_token_generator.make_token(user)
                reset_url = f"https://thecirclepass.com/reset-password/{uid}/{token}"
                return Response({"message": "Password reset sent", "reset_url": reset_url}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                # Djoser handles this gracefully, but just in case
                pass
        return response

class StubView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"message": "501 Not Implemented"}, status=status.HTTP_501_NOT_IMPLEMENTED)
        
    def post(self, request, *args, **kwargs):
        return Response({"message": "501 Not Implemented"}, status=status.HTTP_501_NOT_IMPLEMENTED)

class OrganizerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsOrganizer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        # Organizer can only see and edit their own profile
        return OrganizerProfile.objects.filter(user=self.request.user)

class PublicOrganizerProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            profile = OrganizerProfile.objects.get(pk=pk)
        except OrganizerProfile.DoesNotExist:
            return Response({'error': 'Organizer not found'}, status=404)
            
        # Get active events (Upcoming)
        from core.models import Event, FollowedOrganizer
        from django.utils import timezone
        
        events_qs = Event.objects.filter(organizer=profile, status__in=['PUBLISHED', 'LIVE'])
        upcoming_events = []
        past_events = []
        
        now = timezone.now()
        for e in events_qs:
            event_data = {
                'id': e.id,
                'slug': e.slug,
                'title': e.title,
                'start_time': e.start_time,
            }
            cover = (e.cover_image.url if hasattr(e.cover_image, 'url') else str(e.cover_image)) if e.cover_image else None
            if cover and not cover.startswith(('http://', 'https://')):
                if not cover.startswith('/'):
                    cover = '/media/' + cover if not cover.startswith('media/') else '/' + cover
                cover = request.build_absolute_uri(cover)
            event_data['cover_image'] = cover
            # For simplicity we treat events starting after now as upcoming
            if e.start_time and e.start_time > now:
                event_data['status'] = 'upcoming'
                upcoming_events.append(event_data)
            else:
                event_data['status'] = 'past'
                past_events.append(event_data)
                
        is_followed = False
        if request.user.is_authenticated:
            is_followed = FollowedOrganizer.objects.filter(organizer=profile, user=request.user).exists()
            
        follower_count = FollowedOrganizer.objects.filter(organizer=profile).count()

        return Response({
            'id': profile.id,
            'name': profile.company_name,
            'logo': profile.logo,
            'bio': profile.bio,
            'follower_count': follower_count,
            'is_followed': is_followed,
            'is_verified': profile.is_verified,
            'instagram': profile.instagram_handle,
            'website': profile.website,
            'upcoming_events': upcoming_events,
            'past_events': past_events,
        })

from .serializers import OrganizerVerificationSerializer
from core.models import OrganizerVerification

class OrganizerVerificationView(APIView):
    permission_classes = [IsOrganizerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        # Gracefully handle Admin users previewing the organizer dashboard
        # by creating a profile if one doesn't exist, or just fetching it.
        profile, _ = OrganizerProfile.objects.get_or_create(user=self.request.user)
        obj, created = OrganizerVerification.objects.get_or_create(organizer=profile)
        return obj

    def get(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = OrganizerVerificationSerializer(obj)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = OrganizerVerificationSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            # Automatically verify organizers instead of requiring admin approval
            serializer.save(status='Verified')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from core.models import Event, EventCategory
from .serializers import EventSerializer, EventCreateUpdateSerializer, EventCategorySerializer
from core.utils.screening import screen_event
from django.db.models import Q, F, ExpressionWrapper, FloatField
from django.db.models.functions import Cos, Sin, ASin, Sqrt, Radians, Power

class EventCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = EventCategory.objects.all()
    serializer_class = EventCategorySerializer

class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EventCreateUpdateSerializer
        return EventSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        
        # Track page views when a specific event is viewed publicly
        slug = request.query_params.get('slug')
        is_public = request.query_params.get('public') == 'true'
        
        if slug and is_public:
            Event.objects.filter(slug=slug).update(page_views=F('page_views') + 1)
            
        return response

    def get_queryset(self):
        user = self.request.user
        is_public = self.request.query_params.get('public') == 'true'
        slug = self.request.query_params.get('slug')

        if user.is_authenticated and hasattr(user, 'role') and not is_public:
            if user.role == 'ADMIN':
                qs = Event.objects.all().order_by('-id')
            elif user.role == 'ORGANIZER':
                qs = Event.objects.filter(organizer__user=user).order_by('-id')
            else:
                qs = Event.objects.filter(status__in=['PUBLISHED', 'LIVE']).order_by('-id')
        else:
            if user.is_authenticated and user.role in ['ORGANIZER', 'ADMIN']:
                # If public request but authenticated as organizer/admin, let them see public events PLUS their own drafts
                qs = Event.objects.filter(Q(status__in=['PUBLISHED', 'LIVE']) | Q(organizer__user=user)).order_by('-id')
            else:
                qs = Event.objects.filter(status__in=['PUBLISHED', 'LIVE']).order_by('-id')

        # Simple Filtering & Searching
        q = self.request.query_params.get('q', None)
        category_slug = self.request.query_params.get('category', None)
        is_online = self.request.query_params.get('is_online', None)
        slug = self.request.query_params.get('slug', None)

        if q:
            qs = qs.filter(
                Q(title__icontains=q) | 
                Q(description__icontains=q) |
                Q(venue__name__icontains=q) |
                Q(venue__location__icontains=q)
            )
        
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
            
        if slug:
            qs = qs.filter(slug=slug)
            
        if is_online is not None:
            is_online_bool = is_online.lower() == 'true'
            qs = qs.filter(is_online=is_online_bool)

        location = self.request.query_params.get('location', None)
        if location and location.lower() != 'any':
            qs = qs.filter(venue__location__icontains=location)
            
        date_param = self.request.query_params.get('date', None)
        if date_param and date_param.lower() != 'any':
            from django.utils import timezone
            import datetime
            now = timezone.now()
            
            if date_param == 'today':
                qs = qs.filter(start_time__date=now.date())
            elif date_param == 'this_weekend':
                weekday = now.weekday()
                if weekday == 4:
                    friday = now
                elif weekday == 5:
                    friday = now - datetime.timedelta(days=1)
                elif weekday == 6:
                    friday = now - datetime.timedelta(days=2)
                else:
                    friday = now + datetime.timedelta(days=(4 - weekday))
                
                friday = friday.replace(hour=0, minute=0, second=0, microsecond=0)
                sunday = friday + datetime.timedelta(days=2)
                sunday = sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
                qs = qs.filter(start_time__gte=friday, start_time__lte=sunday)
            elif date_param == 'this_month':
                qs = qs.filter(start_time__year=now.year, start_time__month=now.month)

        # Location-based Radius Search (Haversine formula in km)
        lat_param = self.request.query_params.get('lat', None)
        lng_param = self.request.query_params.get('lng', None)
        radius_param = self.request.query_params.get('radius', 50) # default 50km

        if lat_param and lng_param:
            try:
                lat = float(lat_param)
                lng = float(lng_param)
                radius = float(radius_param)

                lat_rad = Radians(lat)
                lng_rad = Radians(lng)
                v_lat_rad = Radians('venue__latitude')
                v_lng_rad = Radians('venue__longitude')

                dlat = v_lat_rad - lat_rad
                dlng = v_lng_rad - lng_rad

                a = Power(Sin(dlat / 2.0), 2) + Cos(lat_rad) * Cos(v_lat_rad) * Power(Sin(dlng / 2.0), 2)
                c = 2 * ASin(Sqrt(a))
                distance = 6371.0 * c # Earth radius in km

                qs = qs.exclude(venue__latitude__isnull=True, venue__longitude__isnull=True)
                qs = qs.annotate(distance=ExpressionWrapper(distance, output_field=FloatField()))
                qs = qs.filter(distance__lte=radius).order_by('distance')
            except ValueError:
                pass # ignore invalid lat/lng/radius

        return qs

    def perform_create(self, serializer):
        try:
            organizer = OrganizerProfile.objects.get(user=self.request.user)
        except OrganizerProfile.DoesNotExist:
            if self.request.user.role == 'ADMIN':
                organizer = OrganizerProfile.objects.create(
                    user=self.request.user,
                    company_name="CirclePass Admin",
                    is_verified=True
                )
            else:
                raise serializers.ValidationError("User is not an organizer.")
                
        serializer.save(organizer=organizer, status='DRAFT')

    def perform_update(self, serializer):
        event = self.get_object()
        old_status = event.status
        updated_event = serializer.save()

        # If event goes LIVE or PUBLISHED, trigger Waitlist presale emails
        if old_status not in ['LIVE', 'PUBLISHED'] and updated_event.status in ['LIVE', 'PUBLISHED']:
            from .tasks import notify_waitlist_on_launch
            notify_waitlist_on_launch.delay(updated_event.id)

    @action(detail=True, methods=['post'], permission_classes=[IsOrganizerOrAdmin])
    def submit(self, request, pk=None):
        event = self.get_object()
        
        if event.status not in ['DRAFT', 'CHANGES_REQUIRED']:
            return Response(
                {"detail": "Only events in DRAFT or CHANGES_REQUIRED can be published."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Basic validation before publishing
        if not event.title or not event.start_time or not event.end_time:
            return Response(
                {"detail": "All required fields must be filled before publishing."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        event.status = 'PUBLISHED'
        event.save(update_fields=['status'])
        
        return Response({
            "detail": "Event published successfully.",
            "status": "PUBLISHED"
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsOrganizerOrAdmin])
    def overview(self, request, pk=None):
        event = self.get_object()
        from core.models import Ticket, CheckIn
        
        # Calculate stats
        total_capacity = event.capacity
        tickets_sold = Ticket.objects.filter(ticket_type__event=event, status__in=['ISSUED', 'ACTIVE', 'USED']).count()
        check_ins = CheckIn.objects.filter(ticket__ticket_type__event=event).count()
        
        # We can also calculate revenue if needed, but for now we'll stick to basic stats
        
        return Response({
            "id": event.id,
            "title": event.title,
            "start_time": event.start_time,
            "status": event.status,
            "total_capacity": total_capacity,
            "tickets_sold": tickets_sold,
            "check_ins": check_ins,
            "sales_paused": event.sales_paused,
            "waitlist_enabled": event.waitlist_enabled,
        })

    @action(detail=True, methods=['get'], permission_classes=[IsOrganizerOrAdmin])
    def analytics(self, request, pk=None):
        event = self.get_object()
        from core.models import Ticket, Order
        from django.db.models import Sum

        # Basic stats
        tickets = Ticket.objects.filter(ticket_type__event=event, status__in=['ISSUED', 'ACTIVE', 'USED'])
        tickets_sold = tickets.count()
        check_ins = tickets.filter(status='USED').count()

        # Total revenue (kobo)
        # Orders that are completed for this event
        completed_orders = Order.objects.filter(event=event, status='COMPLETED')
        revenue_aggr = completed_orders.aggregate(total=Sum('total_amount'))
        total_revenue = revenue_aggr['total'] or 0

        # Ticket tiers breakdown
        tiers = []
        for tt in event.ticket_types.all():
            tier_sold = Ticket.objects.filter(ticket_type=tt, status__in=['ISSUED', 'ACTIVE', 'USED']).count()
            tiers.append({
                "id": tt.id,
                "name": tt.name,
                "tier": tt.tier,
                "quantity": tt.quantity,
                "sold": tier_sold
            })

        return Response({
            "total_revenue": total_revenue,
            "tickets_sold": tickets_sold,
            "page_views": event.page_views,
            "check_ins": check_ins,
            "ticket_tiers": tiers
        })

class WaitlistEntryCreateView(APIView):
    """
    POST /api/events/<event_id>/waitlist/
    Allows users to join a waitlist or presale notification list for an event.
    """
    permission_classes = [AllowAny]

    def post(self, request, event_id):
        from core.models import WaitlistEntry
        email = request.data.get('email')
        name = request.data.get('name', '')

        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not event.waitlist_enabled:
            return Response({'detail': 'Waitlist is not enabled for this event.'}, status=status.HTTP_400_BAD_REQUEST)

        entry, created = WaitlistEntry.objects.get_or_create(
            event=event,
            email=email,
            defaults={'name': name}
        )

        if not created:
            return Response({'detail': 'You are already on the list!'}, status=status.HTTP_200_OK)

        return Response({'detail': 'Successfully joined the waitlist!'}, status=status.HTTP_201_CREATED)

from core.models import SupportTicket
from api.serializers import SupportTicketSerializer

from rest_framework.permissions import IsAuthenticated

class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return SupportTicket.objects.all().order_by('-created_at')
        return SupportTicket.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
