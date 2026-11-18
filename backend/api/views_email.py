"""Unsubscribe endpoint behind the link at the bottom of CirclePass email."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import EmailOptOut
from core.utils.email_prefs import (
    is_email_opted_out, mask_email, read_unsubscribe_token,
)
from core.utils.email_validation import email_suggestion, normalise_email


class EmailCheckView(APIView):
    """GET /api/email/check/?email=... — report a likely typo, save nothing.

    The checkout and sign-up forms use this to warn before submitting; the
    serializers apply the same correction server-side, so a request that skips
    the warning still ends up with a working address.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        email = (request.query_params.get('email') or '').strip()
        suggestion = email_suggestion(email)
        return Response({
            'email': email,
            'normalised': normalise_email(email),
            'suggestion': suggestion,
            'corrected': bool(suggestion),
        })


class EmailUnsubscribeView(APIView):
    """GET /api/email/unsubscribe/?token=... — confirm the address.

    POST /api/email/unsubscribe/ — record the opt-out. Splitting the two means
    a link preview or security scanner cannot unsubscribe someone by accident.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        email = read_unsubscribe_token(request.query_params.get('token', ''))
        if not email:
            return Response(
                {'detail': 'This unsubscribe link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            'email': mask_email(email),
            'unsubscribed': is_email_opted_out(email),
        })

    def post(self, request):
        token = request.data.get('token') or request.query_params.get('token', '')
        email = read_unsubscribe_token(token)
        if not email:
            return Response(
                {'detail': 'This unsubscribe link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        EmailOptOut.objects.get_or_create(
            email=email, defaults={'reason': 'Unsubscribed from email link'},
        )
        return Response({
            'detail': 'You have been unsubscribed from CirclePass emails.',
            'email': mask_email(email),
            'unsubscribed': True,
        })
