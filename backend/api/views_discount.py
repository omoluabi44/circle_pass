from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from core.models import Discount, Event


class EventDiscountListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                event = Event.objects.get(pk=event_id)
            else:
                event = Event.objects.get(pk=event_id, organizer__user=request.user)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        discounts = Discount.objects.filter(event=event)
        data = [{
            'id': d.id, 'code': d.code, 'type': d.type, 'value': d.value,
            'usage_limit': d.usage_limit, 'usage_count': d.usage_count,
            'valid_from': d.valid_from, 'valid_until': d.valid_until,
            'is_active': d.is_active, 'created_at': d.created_at,
        } for d in discounts]
        return Response(data)

    def post(self, request, event_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                event = Event.objects.get(pk=event_id)
            else:
                event = Event.objects.get(pk=event_id, organizer__user=request.user)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        code = request.data.get('code', '').strip().upper()
        if not code:
            return Response({'error': 'Discount code is required'}, status=400)
        if Discount.objects.filter(event=event, code=code).exists():
            return Response({'error': 'This code already exists for this event'}, status=400)
            
        discount_type = request.data.get('type', 'PERCENTAGE')
        discount_value = int(request.data.get('value', 0))
        
        # Enforce 95% max limit
        if discount_type == 'PERCENTAGE' and discount_value > 95:
            return Response({'error': 'Percentage discount cannot exceed 95%'}, status=400)

        discount = Discount.objects.create(
            event=event, code=code,
            type=discount_type,
            value=discount_value,
            usage_limit=int(request.data.get('usage_limit', 0)),
            valid_from=request.data.get('valid_from'),
            valid_until=request.data.get('valid_until'),
            is_active=request.data.get('is_active', True),
        )
        return Response({'id': discount.id, 'code': discount.code, 'type': discount.type, 'value': discount.value}, status=201)

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
            
        if discount.usage_limit > 0 and discount.usage_count >= discount.usage_limit:
            return Response({'error': 'This discount code has reached its usage limit'}, status=400)
            
        now = timezone.now()
        if discount.valid_from and now < discount.valid_from:
            return Response({'error': 'This discount code is not yet valid'}, status=400)
        if discount.valid_until and now > discount.valid_until:
            return Response({'error': 'This discount code has expired'}, status=400)
            
        return Response({
            'code': discount.code,
            'type': discount.type,
            'value': discount.value
        })
class EventDiscountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id, discount_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                discount = Discount.objects.get(pk=discount_id, event_id=event_id)
            else:
                discount = Discount.objects.get(pk=discount_id, event_id=event_id, event__organizer__user=request.user)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount not found'}, status=404)
        discount.delete()
        return Response(status=204)

    def patch(self, request, event_id, discount_id):
        try:
            if getattr(request.user, 'role', '') == 'ADMIN':
                discount = Discount.objects.get(pk=discount_id, event_id=event_id)
            else:
                discount = Discount.objects.get(pk=discount_id, event_id=event_id, event__organizer__user=request.user)
        except Discount.DoesNotExist:
            return Response({'error': 'Discount not found'}, status=404)
        for field in ['is_active', 'usage_limit', 'valid_from', 'valid_until', 'value', 'type']:
            if field in request.data:
                setattr(discount, field, request.data[field])
                
        # Enforce 95% max limit after updates
        if discount.type == 'PERCENTAGE' and int(discount.value) > 95:
            return Response({'error': 'Percentage discount cannot exceed 95%'}, status=400)
            
        discount.save()
        return Response({'id': discount.id, 'code': discount.code, 'is_active': discount.is_active})
