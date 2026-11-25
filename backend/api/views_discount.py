from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from core.models import Discount, Event
from api.permissions import is_admin_user, user_can_manage_event


def _parse_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _parse_ticket_type_ids(request, event):
    """Validate the submitted ticket-class ids belong to this event."""
    raw = request.data.get('ticket_type_ids', [])
    if isinstance(raw, str):
        raw = [v for v in raw.split(',') if v.strip()]
    if not isinstance(raw, list):
        raw = []
    ids = []
    for value in raw:
        try:
            ids.append(int(value))
        except (TypeError, ValueError):
            continue
    if ids:
        valid = set(event.ticket_types.filter(id__in=ids).values_list('id', flat=True))
        if any(t not in valid for t in ids):
            return None, 'One or more selected ticket classes do not belong to this event.'
    return ids, None


class EventDiscountListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response({'error': 'You do not have permission to view discounts for this event.'}, status=403)
        discounts = Discount.objects.filter(event=event)
        data = []
        for d in discounts:
            usage = d.completed_usage_count()
            data.append({
                'id': d.id, 'code': d.code,
                'type': d.type, 'discount_type': d.type,
                'value': d.value,
                'usage_limit': d.usage_limit,
                'usage_count': usage, 'times_used': usage,
                'discount_usage_count': d.usage_count,
                'ticket_type_ids': d.ticket_type_ids or [],
                'allow_multiple_per_user': d.allow_multiple_per_user,
                'valid_from': d.valid_from, 'valid_until': d.valid_until,
                'is_active': d.is_active, 'created_at': d.created_at,
            })
        return Response(data)

    def post(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response({'error': 'You do not have permission to manage discounts for this event.'}, status=403)
        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return Response({'error': 'Discount code is required'}, status=400)
        if Discount.objects.filter(event=event, code=code).exists():
            return Response({'error': 'This code already exists for this event'}, status=400)

        # The UI sends `discount_type`; older clients send `type`.
        discount_type = (request.data.get('type') or request.data.get('discount_type') or 'PERCENTAGE').strip().upper()
        if discount_type not in ('PERCENTAGE', 'FIXED'):
            return Response({'error': 'Discount type must be Percentage or Amount'}, status=400)

        try:
            discount_value = int(float(request.data.get('value') or 0))
        except (TypeError, ValueError):
            return Response({'error': 'Discount value must be a number'}, status=400)

        # Enforce 95% max limit
        if discount_type == 'PERCENTAGE' and discount_value > 95:
            return Response({'error': 'Percentage discount cannot exceed 95%'}, status=400)
        if discount_type == 'PERCENTAGE' and discount_value <= 0:
            return Response({'error': 'Percentage discount must be greater than zero'}, status=400)
        if discount_type == 'FIXED' and discount_value <= 0:
            return Response({'error': 'Fixed amount must be greater than zero'}, status=400)

        try:
            usage_limit = int(float(request.data.get('usage_limit') or 0))
        except (TypeError, ValueError):
            usage_limit = 0
        if usage_limit < 0:
            usage_limit = 0

        ticket_type_ids, tier_error = _parse_ticket_type_ids(request, event)
        if tier_error:
            return Response({'error': tier_error}, status=400)

        discount = Discount.objects.create(
            event=event, code=code,
            type=discount_type,
            value=discount_value,
            usage_limit=usage_limit,
            ticket_type_ids=ticket_type_ids,
            allow_multiple_per_user=_parse_bool(
                request.data.get('allow_multiple_per_user'), default=True,
            ),
            valid_from=request.data.get('valid_from') or None,
            valid_until=request.data.get('valid_until') or None,
            is_active=_parse_bool(request.data.get('is_active'), default=True),
        )
        return Response({
            'id': discount.id, 'code': discount.code,
            'type': discount.type, 'discount_type': discount.type,
            'value': discount.value,
            'usage_limit': discount.usage_limit,
            'ticket_type_ids': discount.ticket_type_ids,
            'allow_multiple_per_user': discount.allow_multiple_per_user,
            'valid_until': discount.valid_until,
            'is_active': discount.is_active,
        }, status=201)

class EventDiscountValidateView(APIView):
    permission_classes = [] # Allow any for checkout validation

    def get(self, request, event_id):
        code = request.query_params.get('code', '').strip().upper()
        if not code:
            return Response({'error': 'Discount code is required'}, status=400)
            
        try:
            discount = Discount.objects.get(event_id=event_id, code=code)
        except Discount.DoesNotExist:
            return Response({'error': 'Invalid discount code'}, status=404)
            
        if not discount.is_active:
            return Response({'error': 'This discount code is inactive'}, status=400)
            
        if discount.usage_limit > 0 and max(
            discount.usage_count, discount.completed_usage_count()
        ) >= discount.usage_limit:
            return Response({'error': 'This discount code has reached its usage limit'}, status=400)
            
        now = timezone.now()
        if discount.valid_from and now < discount.valid_from:
            return Response({'error': 'This discount code is not yet valid'}, status=400)
        if discount.valid_until and now > discount.valid_until:
            return Response({'error': 'This discount code has expired'}, status=400)

        buyer_email = request.query_params.get('email', '').strip()
        if buyer_email and discount.buyer_has_used(buyer_email):
            return Response(
                {'error': 'This discount code can only be used once per person.'},
                status=400,
            )

        return Response({
            'code': discount.code,
            'type': discount.type,
            'value': discount.value,
            'ticket_type_ids': discount.ticket_type_ids or [],
            'allow_multiple_per_user': discount.allow_multiple_per_user,
        })
class EventDiscountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id, discount_id):
        try:
            discount = Discount.objects.select_related('event', 'event__organizer').get(pk=discount_id, event_id=event_id)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount not found'}, status=404)
        if not user_can_manage_event(request.user, discount.event):
            return Response({'error': 'You do not have permission to manage discounts for this event.'}, status=403)
        discount.delete()
        return Response(status=204)

    def patch(self, request, event_id, discount_id):
        try:
            discount = Discount.objects.select_related('event', 'event__organizer').get(pk=discount_id, event_id=event_id)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount not found'}, status=404)
        if not user_can_manage_event(request.user, discount.event):
            return Response({'error': 'You do not have permission to manage discounts for this event.'}, status=403)
        requested_type = request.data.get('type') or request.data.get('discount_type')
        if requested_type:
            requested_type = str(requested_type).strip().upper()
            if requested_type not in ('PERCENTAGE', 'FIXED'):
                return Response({'error': 'Discount type must be Percentage or Amount'}, status=400)
            discount.type = requested_type

        if 'code' in request.data:
            new_code = (request.data.get('code') or '').strip().upper()
            if not new_code:
                return Response({'error': 'Discount code is required'}, status=400)
            if Discount.objects.filter(
                event=discount.event, code=new_code
            ).exclude(pk=discount.pk).exists():
                return Response({'error': 'This code already exists for this event'}, status=400)
            discount.code = new_code

        if 'value' in request.data:
            try:
                discount.value = int(float(request.data.get('value') or 0))
            except (TypeError, ValueError):
                return Response({'error': 'Discount value must be a number'}, status=400)

        if 'usage_limit' in request.data:
            try:
                discount.usage_limit = max(0, int(float(request.data.get('usage_limit') or 0)))
            except (TypeError, ValueError):
                discount.usage_limit = 0

        if 'ticket_type_ids' in request.data:
            ticket_type_ids, tier_error = _parse_ticket_type_ids(request, discount.event)
            if tier_error:
                return Response({'error': tier_error}, status=400)
            discount.ticket_type_ids = ticket_type_ids

        if 'allow_multiple_per_user' in request.data:
            discount.allow_multiple_per_user = _parse_bool(
                request.data.get('allow_multiple_per_user'), default=True,
            )

        for field in ['valid_from', 'valid_until']:
            if field in request.data:
                setattr(discount, field, request.data[field] or None)

        if 'is_active' in request.data:
            discount.is_active = _parse_bool(request.data['is_active'], default=True)

        # Enforce limits after updates
        if discount.type == 'PERCENTAGE' and int(discount.value) > 95:
            return Response({'error': 'Percentage discount cannot exceed 95%'}, status=400)
        if discount.type == 'PERCENTAGE' and int(discount.value) <= 0:
            return Response({'error': 'Percentage discount must be greater than zero'}, status=400)
        if discount.type == 'FIXED' and int(discount.value) <= 0:
            return Response({'error': 'Fixed amount must be greater than zero'}, status=400)

        discount.save()
        return Response({
            'id': discount.id, 'code': discount.code,
            'type': discount.type, 'discount_type': discount.type,
            'value': discount.value,
            'usage_limit': discount.usage_limit,
            'ticket_type_ids': discount.ticket_type_ids or [],
            'allow_multiple_per_user': discount.allow_multiple_per_user,
            'valid_until': discount.valid_until,
            'is_active': discount.is_active,
        })
