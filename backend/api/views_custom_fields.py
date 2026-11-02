from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import Event, EventCustomField


class EventCustomFieldListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_event(self, request, event_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                return Event.objects.get(pk=event_id)
            return Event.objects.get(pk=event_id, organizer__user=request.user)
        except Event.DoesNotExist:
            return None

    def _serialize(self, field):
        return {
            'id': field.id,
            'label': field.label,
            'field_type': field.field_type,
            'options': field.options,
            'required': field.required,
            'position': field.position,
        }

    def get(self, request, event_id):
        event = self._get_event(request, event_id)
        if not event:
            return Response({'error': 'Event not found'}, status=404)
        fields = EventCustomField.objects.filter(event=event)
        return Response([self._serialize(f) for f in fields])

    def post(self, request, event_id):
        event = self._get_event(request, event_id)
        if not event:
            return Response({'error': 'Event not found'}, status=404)

        label = (request.data.get('label') or '').strip()
        if not label:
            return Response({'error': 'Label is required'}, status=400)

        field_type = request.data.get('field_type', 'text')
        if field_type not in ('text', 'number', 'select'):
            field_type = 'text'

        options = request.data.get('options', [])
        if not isinstance(options, list):
            options = []

        required = bool(request.data.get('required', False))
        position = EventCustomField.objects.filter(event=event).count()

        field = EventCustomField.objects.create(
            event=event,
            label=label,
            field_type=field_type,
            options=options,
            required=required,
            position=position,
        )
        return Response(self._serialize(field), status=201)


class EventCustomFieldDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_field(self, request, event_id, field_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                event = Event.objects.get(pk=event_id)
            else:
                event = Event.objects.get(pk=event_id, organizer__user=request.user)
            return EventCustomField.objects.get(pk=field_id, event=event)
        except (Event.DoesNotExist, EventCustomField.DoesNotExist):
            return None

    def _serialize(self, field):
        return {
            'id': field.id,
            'label': field.label,
            'field_type': field.field_type,
            'options': field.options,
            'required': field.required,
            'position': field.position,
        }

    def patch(self, request, event_id, field_id):
        field = self._get_field(request, event_id, field_id)
        if not field:
            return Response({'error': 'Field not found'}, status=404)

        if 'label' in request.data:
            field.label = (request.data['label'] or '').strip() or field.label
        if 'field_type' in request.data and request.data['field_type'] in ('text', 'number', 'select'):
            field.field_type = request.data['field_type']
        if 'options' in request.data and isinstance(request.data['options'], list):
            field.options = request.data['options']
        if 'required' in request.data:
            field.required = bool(request.data['required'])
        if 'position' in request.data:
            field.position = int(request.data['position'])

        field.save()
        return Response(self._serialize(field))

    def delete(self, request, event_id, field_id):
        field = self._get_field(request, event_id, field_id)
        if not field:
            return Response({'error': 'Field not found'}, status=404)
        field.delete()
        return Response(status=204)


class PublicEventCustomFieldListView(APIView):
    """Public endpoint: returns custom fields for a given event (used at checkout)."""

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id, status__in=['PUBLISHED', 'LIVE'])
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        fields = EventCustomField.objects.filter(event=event)
        data = [
            {
                'id': f.id,
                'label': f.label,
                'field_type': f.field_type,
                'options': f.options,
                'required': f.required,
            }
            for f in fields
        ]
        return Response(data)
