from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import EventAnnouncement, Event
from api.permissions import is_admin_user, user_can_manage_event


class EventAnnouncementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response({'error': 'You do not have permission to view announcements for this event.'}, status=403)
        announcements = EventAnnouncement.objects.filter(event=event)
        data = [{
            'id': a.id, 'title': a.title, 'message': a.message,
            'audience': a.audience,
            'ticket_type_ids': a.ticket_type_ids or [],
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
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response({'error': 'You do not have permission to send announcements for this event.'}, status=403)

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

        # Ticket tier targeting: empty means every attendee tier.
        raw_ticket_types = request.data.get('ticket_type_ids', [])
        if not isinstance(raw_ticket_types, list):
            raw_ticket_types = []
        ticket_type_ids = []
        for value in raw_ticket_types:
            try:
                ticket_type_ids.append(int(value))
            except (TypeError, ValueError):
                continue
        if ticket_type_ids:
            event_tier_ids = set(
                event.ticket_types.filter(id__in=ticket_type_ids)
                .values_list('id', flat=True)
            )
            invalid = [t for t in ticket_type_ids if t not in event_tier_ids]
            if invalid:
                return Response(
                    {'error': 'One or more selected ticket tiers do not belong to this event.'},
                    status=400,
                )

        # Determine dispatch parameters based on audience choice
        include_attendees = audience in ('attendees_only', 'both')
        extra = custom_recipients if audience in ('custom_only', 'both') else []

        from api.tasks import resolve_announcement_recipients, send_event_announcement_email

        # Resolve the audience up front so we can tell the organizer the truth
        # instead of returning success for an announcement that reached nobody.
        recipients = resolve_announcement_recipients(
            event,
            include_attendees=include_attendees,
            extra_recipients=extra,
            ticket_type_ids=ticket_type_ids if include_attendees else [],
        )
        if not recipients:
            if include_attendees and ticket_type_ids:
                tier_names = ', '.join(
                    event.ticket_types.filter(id__in=ticket_type_ids).values_list('name', flat=True)
                )
                return Response({
                    'error': (
                        f'No attendees hold the selected ticket tier yet ({tier_names}).'
                    )
                }, status=400)
            return Response({
                'error': (
                    'No recipients found. There are no completed ticket orders for this event yet'
                    if include_attendees
                    else 'No valid email addresses were provided.'
                )
            }, status=400)

        announcement = EventAnnouncement.objects.create(
            event=event, title=title, message=message,
            audience=audience, ticket_type_ids=ticket_type_ids,
            recipients_count=len(recipients),
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
                    ticket_type_ids=ticket_type_ids,
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
                    ticket_type_ids=ticket_type_ids,
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
            'ticket_type_ids': announcement.ticket_type_ids or [],
            'recipients_count': announcement.recipients_count,
            'delivered_count': announcement.delivered_count,
            'delivery_status': announcement.delivery_status,
            'delivery_error': announcement.delivery_error,
            'dispatch': dispatch,
            'created_at': announcement.created_at,
        }, status=201)
