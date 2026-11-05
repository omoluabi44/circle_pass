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
        data = [{
            'id': a.id, 'title': a.title, 'message': a.message,
            'audience': a.audience,
            'recipients_count': a.recipients_count,
            'delivered_count': a.delivered_count,
            'delivery_status': a.delivery_status,
            'delivery_error': a.delivery_error,
            'sent_at': a.sent_at,
            'created_at': a.created_at,
        } for a in announcements]
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

        # Email marketing fields
        audience = request.data.get('audience', 'attendees_only')
        custom_recipients = request.data.get('custom_recipients', [])
        if not isinstance(custom_recipients, list):
            custom_recipients = []
        # Sanitise: strip whitespace, lowercase, remove empty entries
        custom_recipients = [e.strip().lower() for e in custom_recipients if isinstance(e, str) and e.strip()]

        # Determine dispatch parameters based on audience choice
        include_attendees = audience in ('attendees_only', 'both')
        extra = custom_recipients if audience in ('custom_only', 'both') else []

        from api.tasks import resolve_announcement_recipients, send_event_announcement_email

        # Resolve the audience up front so we can tell the organizer the truth
        # instead of returning success for an announcement that reached nobody.
        recipients = resolve_announcement_recipients(
            event, include_attendees=include_attendees, extra_recipients=extra
        )
        if not recipients:
            return Response({
                'error': (
                    'No recipients found. There are no completed ticket orders for this event yet'
                    if include_attendees
                    else 'No valid email addresses were provided.'
                )
            }, status=400)

        announcement = EventAnnouncement.objects.create(
            event=event, title=title, message=message,
            audience=audience, recipients_count=len(recipients),
        )

        dispatch = 'queued'
        workers_available = False
        try:
            from circlepass_backend.celery import app as celery_app
            workers_available = bool(celery_app.control.ping(timeout=1.0))
        except Exception:
            workers_available = False

        if workers_available:
            try:
                send_event_announcement_email.delay(
                    announcement.id,
                    include_attendees=include_attendees,
                    extra_recipients=extra,
                )
            except Exception:
                workers_available = False

        if not workers_available:
            # No worker is consuming the queue (or the broker is unreachable).
            # Send inline so the organizer's announcement is not silently lost.
            dispatch = 'sent'
            try:
                send_event_announcement_email(
                    announcement.id,
                    include_attendees=include_attendees,
                    extra_recipients=extra,
                )
            except Exception:
                # The task recorded its own failure on the announcement; return
                # the record so the UI can show what went wrong.
                dispatch = 'failed'

        announcement.refresh_from_db()

        return Response({
            'id': announcement.id,
            'title': announcement.title,
            'message': announcement.message,
            'audience': announcement.audience,
            'recipients_count': announcement.recipients_count,
            'delivered_count': announcement.delivered_count,
            'delivery_status': announcement.delivery_status,
            'delivery_error': announcement.delivery_error,
            'dispatch': dispatch,
            'created_at': announcement.created_at,
        }, status=201)
