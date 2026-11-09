"""Nomba Checkout service layer.

Mirrors the small surface shipped for Paystack: obtain an OAuth token,
create a hosted checkout order, verify a transaction and validate webhook
signatures. All monetary values arrive in integer kobo and are converted to
the decimal string Nomba expects (``"10000.00"``).
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TOKEN_CACHE_KEY = 'nomba:access_token'
REQUEST_TIMEOUT = 20


class NombaError(Exception):
    """Raised when Nomba rejects a request or is not configured."""


def _setting(name, default=''):
    return getattr(settings, name, None) or os.environ.get(name, default)


def get_base_url():
    sandbox = getattr(settings, 'NOMBA_SANDBOX', None)
    if sandbox is None:
        sandbox = os.environ.get('NOMBA_SANDBOX', 'False')
    if not isinstance(sandbox, bool):
        sandbox = str(sandbox).lower() in ('true', '1', 't')
    return 'https://sandbox.nomba.com' if sandbox else 'https://api.nomba.com'


def get_account_id():
    return _setting('NOMBA_ACCOUNT_ID')


def get_webhook_secret():
    return _setting('NOMBA_WEBHOOK_SECRET')


def is_configured():
    """True when the credentials needed to take a payment are present."""
    return bool(
        _setting('NOMBA_CLIENT_ID')
        and _setting('NOMBA_CLIENT_SECRET')
        and get_account_id()
    )


def _headers(token=None):
    headers = {
        'Content-Type': 'application/json',
        'accountId': get_account_id(),
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return headers


# The token cache and the in-process fallback keep us from requesting a new
# token on every checkout when the shared cache is unavailable.
_token_fallback = {'value': None, 'expires_at': 0.0}


def _seconds_until(expires_at):
    if not expires_at:
        return 25 * 60
    try:
        parsed = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt_timezone.utc)
        remaining = (parsed - datetime.now(dt_timezone.utc)).total_seconds()
        # Refresh five minutes early, as recommended by Nomba.
        return max(60, remaining - 300)
    except (ValueError, TypeError):
        return 25 * 60


def get_access_token(force=False):
    """Return a cached bearer token, requesting a fresh one when needed."""
    if not force:
        try:
            cached = cache.get(TOKEN_CACHE_KEY)
        except Exception:  # cache backend unavailable
            cached = None
        if cached:
            return cached
        if _token_fallback['value'] and _token_fallback['expires_at'] > time.time():
            return _token_fallback['value']

    if not is_configured():
        raise NombaError('Nomba is not configured on this environment.')

    response = requests.post(
        f'{get_base_url()}/v1/auth/token/issue',
        headers=_headers(),
        json={
            'grant_type': 'client_credentials',
            'client_id': _setting('NOMBA_CLIENT_ID'),
            'client_secret': _setting('NOMBA_CLIENT_SECRET'),
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get('code') != '00':
        raise NombaError(payload.get('description') or 'Nomba authentication failed.')

    data = payload.get('data') or {}
    token = data.get('access_token')
    if not token:
        raise NombaError('Nomba did not return an access token.')

    ttl = _seconds_until(data.get('expiresAt'))
    try:
        cache.set(TOKEN_CACHE_KEY, token, ttl)
    except Exception:
        pass
    _token_fallback['value'] = token
    _token_fallback['expires_at'] = time.time() + ttl
    return token


def clear_token_cache():
    try:
        cache.delete(TOKEN_CACHE_KEY)
    except Exception:
        pass
    _token_fallback['value'] = None
    _token_fallback['expires_at'] = 0.0


def _amount_string(amount_kobo):
    return str((Decimal(int(amount_kobo)) / Decimal(100)).quantize(Decimal('0.01')))


def create_checkout_order(amount_kobo, email, reference, callback_url=None):
    """Create a hosted Nomba checkout order and return its data.

    Returns ``{'checkout_link', 'order_reference', 'raw'}``. ``order_reference``
    here is Nomba's generated ID (not the reference we supplied) and is what
    ``/v1/checkout/transaction`` expects as ``id``.
    """
    callback_url = callback_url or _setting('NOMBA_CALLBACK_URL') or f"{getattr(settings, 'FRONTEND_URL', 'https://thecirclepass.com')}/payment/callback"

    order = {
        'amount': _amount_string(amount_kobo),
        'currency': 'NGN',
        'orderReference': reference,
        'callbackUrl': callback_url,
    }
    if email:
        order['customerEmail'] = email

    token = get_access_token()
    response = requests.post(
        f'{get_base_url()}/v1/checkout/order',
        headers=_headers(token),
        json={'order': order},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get('code') != '00':
        raise NombaError(payload.get('description') or 'Could not create a Nomba checkout order.')

    data = payload.get('data') or {}
    if not data.get('checkoutLink'):
        raise NombaError('Nomba did not return a checkout link.')

    return {
        'checkout_link': data['checkoutLink'],
        'order_reference': data.get('orderReference', ''),
        'order_id': data.get('orderId', ''),
        'raw': data,
    }


def verify_transaction(reference):
    """Look up a transaction by the order reference we supplied.

    Returns a normalised dict with ``status`` (SUCCESS/PENDING/FAILED/UNKNOWN),
    ``channel``, ``data`` and the raw response.
    """
    if not is_configured():
        return {'status': 'UNKNOWN', 'channel': '', 'data': None, 'raw': None}

    token = get_access_token()
    response = requests.get(
        f'{get_base_url()}/v1/transactions/accounts/single',
        headers=_headers(token),
        params={'orderReference': reference},
        timeout=REQUEST_TIMEOUT,
    )
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if payload.get('code') != '00' or not payload.get('data'):
        return {
            'status': 'NOT_FOUND',
            'channel': '',
            'data': None,
            'raw': payload,
            'description': payload.get('description', ''),
        }

    data = payload['data']
    raw_status = (data.get('status') or '').upper()
    if raw_status == 'SUCCESS':
        status = 'SUCCESS'
    elif raw_status in ('FAILED', 'FAILED PAYMENT', 'CANCELLED', 'REVERSED', 'PAYMENT FAILED'):
        status = 'FAILED'
    else:
        status = 'PENDING'

    return {
        'status': status,
        'channel': data.get('onlineCheckoutPaymentMethod') or data.get('type') or '',
        'data': data,
        'raw': payload,
    }


def compute_webhook_signature(payload, signature_key, timestamp):
    """Reproduce Nomba's webhook HMAC (HmacSHA256, base64) for a payload."""
    data = payload.get('data') or {}
    merchant = data.get('merchant') or {}
    transaction = data.get('transaction') or {}

    response_code = transaction.get('responseCode') or ''
    if response_code == 'null':
        response_code = ''

    hashing_payload = ':'.join([
        payload.get('event_type', '') or '',
        payload.get('requestId', '') or '',
        merchant.get('userId', '') or '',
        merchant.get('walletId', '') or '',
        transaction.get('transactionId', '') or '',
        transaction.get('type', '') or '',
        transaction.get('time', '') or '',
        response_code,
        timestamp or '',
    ])

    digest = hmac.new(
        (signature_key or '').encode('utf-8'),
        hashing_payload.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode('ascii')


def validate_webhook_signature(payload, signature, timestamp):
    """Validate Nomba's ``nomba-signature`` header against the payload."""
    secret = get_webhook_secret()
    if not secret or not signature or not timestamp:
        return False
    computed = compute_webhook_signature(payload, secret, timestamp)
    return hmac.compare_digest(computed, signature)
