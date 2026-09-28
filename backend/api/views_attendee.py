from rest_framework import generics, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from core.models import AttendeeProfile, User, Ticket, SavedEvent, FollowedOrganizer, Event

class AttendeeProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AttendeeProfile
        fields = ('first_name', 'last_name', 'email', 'phone_number')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user
        
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        user.save()

        return super().update(instance, validated_data)


class AttendeeProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/attendee/profile/
    Returns or updates the authenticated attendee's profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttendeeProfileSerializer

    def get_object(self):
        profile, _ = AttendeeProfile.objects.get_or_create(user=self.request.user)
        return profile


class AttendeeDashboardView(APIView):
    """
    GET /api/attendee/dashboard/
    Returns summary metrics and the next upcoming ticket for the attendee dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()

        # Tickets logic
        tickets = Ticket.objects.filter(order__attendee__user=user, status__in=['ISSUED', 'ACTIVE'])
        upcoming_tickets = tickets.filter(order__event__start_time__gte=now).select_related('order__event', 'ticket_type').order_by('order__event__start_time')
        
        upcoming_count = upcoming_tickets.count()
        next_ticket = upcoming_tickets.first()

        next_event_data = None
        if next_ticket:
            ev = next_ticket.order.event
            
            image_url = None
            if ev.cover_image:
                cover_str = str(ev.cover_image)
                if not cover_str.startswith(('http://', 'https://')):
                    if not cover_str.startswith('/'):
                        cover_str = '/media/' + cover_str if not cover_str.startswith('media/') else '/' + cover_str
                image_url = request.build_absolute_uri(cover_str)

            next_event_data = {
                "ticket_id": next_ticket.qr_token or next_ticket.id,
                "title": ev.title,
                "date": ev.start_time.strftime("%b %d, %Y - %I:%M %p"),
                "location": ev.venue.name if ev.venue else "Online",
                "ticket_type": next_ticket.ticket_type.name or next_ticket.ticket_type.tier,
                "image": image_url
            }

        # Saved events & Followed organizers
        saved_count = SavedEvent.objects.filter(user=user).count()
        following_count = FollowedOrganizer.objects.filter(user=user).count()

        # Suggested events (3 random upcoming events)
        suggested = Event.objects.filter(status='PUBLISHED', start_time__gte=now).exclude(
            id__in=tickets.values_list('order__event_id', flat=True)
        ).order_by('?')[:3]

        suggested_data = []
        for ev in suggested:
            img = None
            if ev.cover_image:
                cover_str = str(ev.cover_image)
                if not cover_str.startswith(('http://', 'https://')):
                    if not cover_str.startswith('/'):
                        cover_str = '/media/' + cover_str if not cover_str.startswith('media/') else '/' + cover_str
                img = request.build_absolute_uri(cover_str)
            suggested_data.append({
                "id": ev.id,
                "slug": ev.slug,
                "title": ev.title,
                "date": ev.start_time.strftime("%b %d, %Y"),
                "image": img
            })

        return Response({
            "upcoming_tickets": upcoming_count,
            "saved_events": saved_count,
            "following": following_count,
            "next_event": next_event_data,
            "suggested_events": suggested_data
        })
