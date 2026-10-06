"""
Paystack Transfers API integration.
Handles creating transfer recipients and initiating bank transfers for organizer payouts.
"""
import hashlib
import hmac
import os

import requests


PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '')
PAYSTACK_BASE_URL = 'https://api.paystack.co'


def _headers():
    return {
        'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
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
