"""Email + password sign-in.

Djoser's stock JWT view reports every failure — unknown email, wrong password,
unverified account, Google-only account — with one generic "unable to log in"
message. That is why people whose tickets were bought as guests were told they
"do not exist": guest checkout deliberately does not create a login, so their
email is on orders but not in the user table.
"""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Order, User


class LoginRateThrottle(AnonRateThrottle):
    """Slow down password guessing without locking anyone out mid-typo."""

    rate = '20/minute'


def token_payload(user):
    """Access/refresh plus the same user shape as /auth/users/me/."""
    refresh = RefreshToken.for_user(user)
    role = 'ADMIN' if (user.is_superuser or user.is_staff) else (user.role or 'ATTENDEE')
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'role': role,
            'is_email_verified': bool(user.is_active),
        },
    }


class EmailLoginView(APIView):
    """POST /api/auth/jwt/create/ — sign in with email and password.

    Amounts of why this replaces the Djoser view are in the module docstring.
    Wording matters here: "Incorrect password" and "no account yet" are very
    different problems, and telling a paying attendee they do not exist is the
    fastest way to lose them.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''

        if not email or not password:
            return Response(
                {'detail': 'Enter your email address and password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).order_by('id').first()

        if not user:
            # Guest checkout leaves a buyer on the order without a login. Telling
            # them to sign up with the same email recovers their tickets, because
            # ticket lists already match on the order's guest email.
            has_tickets = Order.objects.filter(
                guest_email__iexact=email
            ).exclude(status='FAILED').exists()
            details = {
                'code': 'no_account',
                'has_tickets': has_tickets,
                'detail': (
                    'You have tickets under this email, but no CirclePass login yet. '
                    'Create one with the same email and your tickets will appear.'
                    if has_tickets
                    else 'No CirclePass account uses that email. Check the spelling, '
                         'or sign up to create one.'
                ),
            }
            return Response(details, status=status.HTTP_400_BAD_REQUEST)

        if not user.has_usable_password():
            return Response(
                {
                    'code': 'use_google',
                    'detail': (
                        'This account signs in with Google. Continue with Google, '
                        'or use "Forgot password?" to set a password.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {
                    'code': 'bad_password',
                    'detail': 'That password is not correct. Try again, or reset it.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {
                    'code': 'unverified',
                    'detail': (
                        'Your email is not verified yet. Enter the 4-digit code we '
                        'emailed you, then sign in.'
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(token_payload(user), status=status.HTTP_200_OK)
