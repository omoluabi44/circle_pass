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
