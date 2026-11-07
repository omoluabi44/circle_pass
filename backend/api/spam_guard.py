"""Lightweight defences against fake/bot account registrations.

Nothing here is meant to be a full anti-abuse system — it blocks the patterns
seen in the wild (disposable inboxes, dotted/digit-stuffed Gmail addresses and
random machine-generated usernames) and cleans up accounts that were never
verified.
"""
import re

from django.utils import timezone


# Inboxes that exist only to receive a verification link.
DISPOSABLE_EMAIL_DOMAINS = {
    '10minutemail.com', '10minutemail.net', '20minutemail.com',
    '33mail.com', 'anonbox.net', 'burnermail.io', 'discard.email',
    'dispostable.com', 'dropmail.me', 'emailondeck.com', 'fakeinbox.com',
    'getairmail.com', 'getnada.com', 'guerrillamail.biz', 'guerrillamail.com',
    'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net',
    'guerrillamail.org', 'harakirimail.com', 'inboxkitten.com', 'jetable.org',
    'mailcatch.com', 'maildrop.cc', 'mailexpire.com', 'mailforspam.com',
    'mailinator.com', 'mailinator.net', 'mailnesia.com', 'mailnull.com',
    'mintemail.com', 'mohmal.com', 'mytemp.email', 'nada.email',
    'sharklasers.com', 'spam4.me', 'spamgourmet.com', 'tempail.com',
    'tempinbox.com', 'tempmail.com', 'tempmail.dev', 'tempmail.net',
    'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'trashmail.com',
    'trashmail.de', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'zetmail.com',
}

# "x.l.h.ok.a.q.8.76@..." — dots/digits used to make every address unique.
# "or6fC1YhKYZEcQJNMZaSeIaPB" — random mixed-case alphanumeric with no vowels.
_RANDOM_USERNAME = re.compile(r'^[A-Za-z0-9]{14,}$')


def _domain(email):
    return email.rsplit('@', 1)[-1].strip().lower()


def is_disposable_email(email):
    domain = _domain(email)
    return any(
        domain == blocked or domain.endswith('.' + blocked)
        for blocked in DISPOSABLE_EMAIL_DOMAINS
    )


def is_suspicious_email(email):
    """True when the address looks machine-generated rather than a person."""
    email = (email or '').strip().lower()
    if '@' not in email:
        return False

    local_part = email.split('@', 1)[0]

    # 3+ dots in the local part, almost always dot-stuffing for uniqueness.
    if local_part.count('.') >= 3:
        return True

    # "name123456789" / "8.76" style tails with a lot of digits.
    digits = sum(character.isdigit() for character in local_part)
    if digits >= 6:
        return True

    return False


def is_suspicious_username(username):
    username = (username or '').strip()
    if not _RANDOM_USERNAME.match(username):
        return False
    has_digit = any(character.isdigit() for character in username)
    # Random tokens flip between upper and lower case constantly; real names
    # (including CamelCase + a year) only change case once or twice.
    case_flips = sum(
        1
        for left, right in zip(username, username[1:])
        if left.isalpha() and right.isalpha() and left.islower() != right.islower()
    )
    return has_digit and case_flips >= 5


def registration_problem(email, username):
    """Return a user-facing reason the signup should be rejected, or None."""
    if not email:
        return None
    if is_disposable_email(email):
        return 'Please sign up with a permanent email address.'
    if is_suspicious_email(email):
        return 'That email address does not look valid. Please use your real inbox.'
    if username and is_suspicious_username(username):
        return 'Please choose a real username.'
    return None


def purge_stale_unverified_users(older_than_hours=48, limit=500):
    """Delete accounts that never completed email verification.

    Returns the number of accounts removed.
    """
    from core.models import User

    cutoff = timezone.now() - timezone.timedelta(hours=older_than_hours)
    stale = User.objects.filter(
        is_active=False,
        is_staff=False,
        is_superuser=False,
        date_joined__lt=cutoff,
    )[:limit]
    ids = list(stale.values_list('id', flat=True))
    if not ids:
        return 0
    User.objects.filter(id__in=ids).delete()
    return len(ids)
