from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import EventAnnouncement, Event


class EventAnnouncementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                event = Event.objects.get(pk=event_id)
            else:
                event = Event.objects.get(pk=event_id, organizer__user=request.user)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        announcements = EventAnnouncement.objects.filter(event=event)
        data = [{'id': a.id, 'title': a.title, 'message': a.message, 'created_at': a.created_at} for a in announcements]
        return Response(data)

    def post(self, request, event_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                event = Event.objects.get(pk=event_id)
            else:
                event = Event.objects.get(pk=event_id, organizer__user=request.user)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        if not title or not message:
            return Response({'error': 'Title and message are required'}, status=400)
            
        announcement = EventAnnouncement.objects.create(event=event, title=title, message=message)
        
        # Trigger async email task
        from api.tasks import send_event_announcement_email
        send_event_announcement_email.delay(announcement.id)
        
        return Response({
            'id': announcement.id, 
            'title': announcement.title, 
            'message': announcement.message, 
            'created_at': announcement.created_at
        }, status=201)
