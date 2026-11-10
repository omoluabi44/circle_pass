"""
Paystack Transfers API integration.
Handles creating transfer recipients and initiating bank transfers for organizer payouts.
"""
import hashlib
import hmac
import os
import re

import requests


from django.conf import settings

PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '')
PAYSTACK_BASE_URL = 'https://api.paystack.co'


def _get_secret_key() -> str:
    return getattr(settings, 'PAYSTACK_SECRET_KEY', '') or os.environ.get('PAYSTACK_SECRET_KEY', '')


def _headers():
    return {
        'Authorization': f'Bearer {_get_secret_key()}',
        'Content-Type': 'application/json',
    }


def create_transfer_recipient(bank_code: str, account_number: str, account_name: str) -> str:
    """
    Create a Paystack Transfer Recipient for a Nigerian bank account.
    Returns the recipient_code string.
    
    Docs: https://paystack.com/docs/transfers/creating-transfer-recipients/
    """
    url = f'{PAYSTACK_BASE_URL}/transferrecipient'
    payload = {
        'type': 'nuban',
        'name': account_name,
        'account_number': account_number,
        'bank_code': bank_code,
        'currency': 'NGN',
    }
    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    
    try:
        data = response.json()
    except Exception:
        response.raise_for_status()
        return None
        
    if not data.get('status'):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")
        
    response.raise_for_status()

    return data['data']['recipient_code']


def initiate_transfer(recipient_code: str, amount_kobo: int, reference: str) -> str:
    """
    Initiate a Paystack Transfer to a recipient.
    Amount is in kobo (integer).
    Returns the transfer_code string.
    
    Docs: https://paystack.com/docs/transfers/single-transfers/
    """
    url = f'{PAYSTACK_BASE_URL}/transfer'
    payload = {
        'source': 'balance',
        'amount': amount_kobo,
        'recipient': recipient_code,
        'reference': reference,
        'reason': f'CirclePass payout {reference}',
    }
    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    
    try:
        data = response.json()
    except Exception:
        response.raise_for_status()
        return None
        
    if not data.get('status'):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")
        
    response.raise_for_status()

    return data['data']['transfer_code']


def verify_transfer_webhook_signature(body: bytes, signature: str) -> bool:
    """
    Verify the HMAC-SHA512 signature on a Paystack webhook delivery.
    Same mechanism as payment webhooks.
    """
    expected = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def resolve_account_number(bank_code: str, account_number: str) -> dict:
    """
    Resolve a bank account number to verify it exists and get the account name.
    Useful for pre-validation before creating a transfer recipient.
    
    Returns: { 'account_number': '...', 'account_name': '...' }
    """
    url = f'{PAYSTACK_BASE_URL}/bank/resolve'
    params = {
        'account_number': account_number,
        'bank_code': bank_code,
    }
    response = requests.get(url, params=params, headers=_headers(), timeout=30)
    response.raise_for_status()

    data = response.json()
    if not data.get('status'):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")

    return data['data']


def normalize_name_tokens(name: str) -> list[str]:
    """
    Normalize a person or business name into uppercase alphanumeric word tokens,
    stripping punctuation and extra whitespace.
    """
    if not name:
        return []
    return re.findall(r'[A-Z0-9]+', str(name).upper())


def is_organizer_bank_name_match(organizer_name: str, account_name: str) -> bool:
    """
    Validate that the resolved bank account holder name matches the organizer's
    name.
    - Case-insensitive and punctuation-insensitive.
    - Supports word-order variations (e.g. 'John Doe' vs 'DOE JOHN').
    - Supports middle names when at least 2 name tokens are present and all tokens
      of the shorter name appear in the longer name.
    """
    org_tokens = normalize_name_tokens(organizer_name)
    acc_tokens = normalize_name_tokens(account_name)
    if not org_tokens or not acc_tokens:
        return False

    org_set = set(org_tokens)
    acc_set = set(acc_tokens)

    if org_set == acc_set:
        return True

    if len(org_set) >= 2 and len(acc_set) >= 2:
        if org_set.issubset(acc_set) or acc_set.issubset(org_set):
            return True

    return False


def get_organizer_bank_name_mismatch_error(organizer_name: str, account_name: str) -> str:
    """Return a clear user-facing error message when bank account name != organizer name."""
    return (
        f'Bank account name "{account_name}" does not match your organizer name '
        f'"{organizer_name}". Please use a bank account registered in your name, '
        f'or update your name and organization name in Account Settings.'
    )


def get_organizer_personal_name(organizer) -> str:
    """Return the organizer's legal/personal name (their user account name)."""
    user = getattr(organizer, 'user', None)
    if user is None:
        return ''
    return (user.get_full_name() or '').strip()


def get_organizer_name_for_display(organizer) -> str:
    """Name shown in validation errors: prefer the person's name, fall back to
    the organization name when the organizer has not set a personal name."""
    personal = get_organizer_personal_name(organizer)
    if personal:
        return personal
    return (getattr(organizer, 'company_name', '') or '').strip()


def get_organizer_matching_names(organizer) -> list[str]:
    """All names a payout bank account may legitimately be registered under.

    A bank account belongs to a person, so the organizer's personal name is the
    primary match. Many organizers run registered businesses, so the organization
    name is still accepted as an alternative (this also preserves the behaviour
    for organizers who never set a personal name).
    """
    names: list[str] = []
    personal = get_organizer_personal_name(organizer)
    if personal:
        names.append(personal)
    company = (getattr(organizer, 'company_name', '') or '').strip()
    if company and company not in names:
        names.append(company)
    return names


def is_bank_name_valid_for_organizer(organizer, account_name: str) -> bool:
    """True when the resolved account name matches the organizer's personal name
    or their organization name."""
    return any(
        is_organizer_bank_name_match(name, account_name)
        for name in get_organizer_matching_names(organizer)
    )
