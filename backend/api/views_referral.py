"""Referral codes: creation, listing and per-code sales tracking.

Referrals are tracking-only. They never discount a ticket and never credit a
wallet - the checkout records the code on the order and everything else is
derived from completed orders.
"""
import re
import secrets

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Discount, Event, Referral
from api.permissions import user_can_manage_event

# Shareable codes must survive being pasted into a URL or read out loud.
CODE_RE = re.compile(r'^[A-Z0-9][A-Z0-9_-]{1,48}$')


def _serialize(referral):
    return {
        'id': referral.id,
        'name': referral.name,
        'code': referral.code,
        'referral_link': referral.referral_link(),
        'sales_count': referral.sales_count(),
        'ticket_count': referral.ticket_count(),
        'is_active': referral.is_active,
        'created_at': referral.created_at,
    }


def _suggest_code(name):
    """Derive a readable code from the referral name."""
    base = re.sub(r'[^A-Za-z0-9]', '', name or '').upper()[:20]
    return base or f'REF{secrets.randbelow(9000) + 1000}'


def _unique_code(event, code, exclude_id=None):
    """Return True when the code is free within this event."""
    referrals = Referral.objects.filter(event=event, code__iexact=code)
    if exclude_id:
        referrals = referrals.exclude(pk=exclude_id)
    if referrals.exists():
        return False
    # A referral code must not shadow a real discount code on the same event.
    # Legacy REFERRAL-type discount rows are the same concept, so ignore them.
    return not Discount.objects.filter(
        event=event, code__iexact=code,
    ).exclude(type='REFERRAL').exists()


def _clean_code(raw):
    return re.sub(r'\s+', '', (raw or '').strip()).upper()


class EventReferralListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response(
                {'error': 'You do not have permission to view referrals for this event.'},
                status=403,
            )
        return Response([
            _serialize(r) for r in Referral.objects.filter(event=event)
        ])

    def post(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=404)
        if not user_can_manage_event(request.user, event):
            return Response(
                {'error': 'You do not have permission to manage referrals for this event.'},
                status=403,
            )

        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Referral name is required'}, status=400)

        code = _clean_code(request.data.get('code')) or _suggest_code(name)
        if not CODE_RE.match(code):
            return Response(
                {'error': 'Referral code must be 2-49 letters, numbers, dashes or underscores.'},
                status=400,
            )
        if not _unique_code(event, code):
            return Response(
                {'error': 'This code is already used on this event.'}, status=400,
            )

        referral = Referral.objects.create(event=event, name=name, code=code)
        return Response(_serialize(referral), status=status.HTTP_201_CREATED)


class EventReferralDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, event_id, referral_id):
        try:
            referral = Referral.objects.select_related('event', 'event__organizer').get(
                pk=referral_id, event_id=event_id,
            )
        except Referral.DoesNotExist:
            return None, Response({'error': 'Referral not found'}, status=404)
        if not user_can_manage_event(request.user, referral.event):
            return None, Response(
                {'error': 'You do not have permission to manage referrals for this event.'},
                status=403,
            )
        return referral, None

    def get(self, request, event_id, referral_id):
        referral, error = self._get(request, event_id, referral_id)
        if error:
            return error
        return Response(_serialize(referral))

    def patch(self, request, event_id, referral_id):
        referral, error = self._get(request, event_id, referral_id)
        if error:
            return error

        if 'name' in request.data:
            name = (request.data.get('name') or '').strip()
            if not name:
                return Response({'error': 'Referral name is required'}, status=400)
            referral.name = name

        if 'code' in request.data:
            code = _clean_code(request.data.get('code'))
            if not CODE_RE.match(code):
                return Response(
                    {'error': 'Referral code must be 2-49 letters, numbers, dashes or underscores.'},
                    status=400,
                )
            if code.upper() != referral.code.upper() and not _unique_code(
                referral.event, code, exclude_id=referral.id,
            ):
                return Response(
                    {'error': 'This code is already used on this event.'}, status=400,
                )
            referral.code = code

        if 'is_active' in request.data:
            referral.is_active = str(request.data['is_active']).strip().lower() in (
                '1', 'true', 'yes', 'on',
            )

        referral.save()
        return Response(_serialize(referral))

    def delete(self, request, event_id, referral_id):
        referral, error = self._get(request, event_id, referral_id)
        if error:
            return error
        referral.delete()
        return Response(status=204)
