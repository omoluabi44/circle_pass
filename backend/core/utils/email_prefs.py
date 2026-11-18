"""Opt-out helpers for non-essential CirclePass email.

Unsubscribe links are signed so a recipient can only act on their own address.
"""
from django.conf import settings
from django.core import signing

UNSUBSCRIBE_SALT = 'circlepass.email.unsubscribe'


def _normalise(email):
    return (email or '').strip().lower()


def unsubscribe_token(email):
    """Signed, URL-safe token for an address."""
    return signing.dumps(_normalise(email), salt=UNSUBSCRIBE_SALT)


def read_unsubscribe_token(token):
    """Return the address in a token, or None when it is invalid/expired."""
    if not token:
        return None
    try:
        email = signing.loads(
            token, salt=UNSUBSCRIBE_SALT, max_age=60 * 60 * 24 * 365 * 3,
        )
    except signing.BadSignature:
        return None
    return _normalise(email) or None


def unsubscribe_url(email):
    from urllib.parse import quote

    base = getattr(
        settings, 'FRONTEND_URL', 'https://thecirclepass.com'
    ).rstrip('/')
    return f'{base}/unsubscribe?token={quote(unsubscribe_token(email))}'


def is_email_opted_out(email):
    from core.models import EmailOptOut

    email = _normalise(email)
    if not email:
        return False
    return EmailOptOut.objects.filter(email__iexact=email).exists()


def mask_email(email):
    local, _, domain = _normalise(email).partition('@')
    if not domain:
        return email or ''
    visible = local[:2] if len(local) > 2 else local[:1]
    return f'{visible}{"*" * max(1, len(local) - len(visible))}@{domain}'
