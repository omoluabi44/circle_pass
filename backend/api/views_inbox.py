from rest_framework import generics, permissions
from core.models import Notification
from rest_framework import serializers
from api.permissions import IsOrganizer

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'type', 'title', 'message', 'is_read', 'created_at')

class OrganizerInboxView(generics.ListAPIView):
    """
    GET /api/organizer/inbox/
    Returns notifications/messages for the organizer.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

from rest_framework.views import APIView
from rest_framework.response import Response
from core.models import Event

class SendMessageToOrganizerView(APIView):
    """
    POST /api/events/<event_id>/message/
    Attendee sends a message to the event organizer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'error': 'Message is required'}, status=400)
            
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
            
        sender_name = request.user.get_full_name() or request.user.username or request.user.email
        
        Notification.objects.create(
            user=event.organizer.user,
            type='EVENT',
            title=f"Message from {sender_name} (Event: {event.title})",
            message=f"{sender_name} ({request.user.email}):\n\n{message_text}"
        )
        
        return Response({'success': True, 'message': 'Message sent successfully.'})
