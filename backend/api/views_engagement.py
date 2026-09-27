"""
Engagement API views: Save Events & Follow Organizers.
Toggle-based endpoints with list views for the attendee dashboard.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Event, OrganizerProfile, SavedEvent, FollowedOrganizer


class SaveEventToggleView(APIView):
    """
    POST /api/events/<id>/save/
    Toggles save state. If already saved → unsave. Returns { saved: bool }.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(
                {'detail': 'Event not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        saved, created = SavedEvent.objects.get_or_create(
            user=request.user, event=event,
        )

        if not created:
            # Already saved → unsave
            saved.delete()
            return Response({'saved': False, 'detail': 'Event unsaved.'})

        return Response({'saved': True, 'detail': 'Event saved.'}, status=status.HTTP_201_CREATED)


class SavedEventListView(APIView):
    """
    GET /api/saved-events/
    Returns authenticated user's saved events.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from api.serializers import SavedEventSerializer
        saved = SavedEvent.objects.filter(
            user=request.user
        ).select_related(
            'event__organizer', 'event__category', 'event__venue'
        ).prefetch_related('event__ticket_types')

        serializer = SavedEventSerializer(saved, many=True)
        return Response(serializer.data)


class FollowOrganizerToggleView(APIView):
    """
    POST /api/organizers/<id>/follow/
    Toggles follow state. Returns { following: bool }.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            organizer = OrganizerProfile.objects.get(pk=pk)
        except OrganizerProfile.DoesNotExist:
            return Response(
                {'detail': 'Organizer not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        followed, created = FollowedOrganizer.objects.get_or_create(
            user=request.user, organizer=organizer,
        )

        if not created:
            followed.delete()
            return Response({'following': False, 'detail': 'Unfollowed organizer.'})

        return Response({'following': True, 'detail': 'Now following organizer.'}, status=status.HTTP_201_CREATED)


class FollowedOrganizerListView(APIView):
    """
    GET /api/followed-organizers/
    Returns authenticated user's followed organizers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from api.serializers import FollowedOrganizerSerializer
        followed = FollowedOrganizer.objects.filter(
            user=request.user
        ).select_related('organizer__user')

        serializer = FollowedOrganizerSerializer(followed, many=True)
        return Response(serializer.data)
