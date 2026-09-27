"""
Paystack API service layer.
Handles initialization, verification, and webhook signature validation.
"""
import hmac
import hashlib
import os
import requests

from django.conf import settings

PAYSTACK_API_URL = "https://api.paystack.co"

def get_secret_key():
    return os.environ.get('PAYSTACK_SECRET_KEY', '')

def get_headers():
    return {
        "Authorization": f"Bearer {get_secret_key()}",
        "Content-Type": "application/json"
    }

def initialize_transaction(amount: int, email: str, reference: str, callback_url: str = None) -> dict:
    """
    Call Paystack to initialize a transaction.
    Amount must be in integer kobo.
    Returns the parsed JSON response.
    """
    url = f"{PAYSTACK_API_URL}/transaction/initialize"
    payload = {
        "amount": amount,
        "email": email,
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url

    response = requests.post(url, json=payload, headers=get_headers())
    response.raise_for_status()
    return response.json()

def verify_transaction(reference: str) -> dict:
    """
    Verify a transaction status via Paystack API.
    """
    url = f"{PAYSTACK_API_URL}/transaction/verify/{reference}"
    response = requests.get(url, headers=get_headers())
    response.raise_for_status()
    return response.json()

def validate_webhook_signature(payload_body: bytes, signature: str) -> bool:
    """
    Validates that a webhook payload was signed by Paystack.
    """
    if not signature:
        return False
        
    secret = get_secret_key().encode('utf-8')
    computed_signature = hmac.new(
        secret,
        payload_body,
        hashlib.sha512
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)
