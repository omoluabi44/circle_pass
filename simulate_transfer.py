import os
import sys
import hmac
import hashlib
import json
import requests

# Load the secret key from your backend .env file
try:
    with open('backend/.env', 'r') as f:
        env_vars = dict(line.strip().split('=', 1) for line in f if '=' in line and not line.startswith('#'))
except FileNotFoundError:
    print("Error: backend/.env file not found.")
    sys.exit(1)

PAYSTACK_SECRET_KEY = env_vars.get('PAYSTACK_SECRET_KEY')
if not PAYSTACK_SECRET_KEY:
    print("Error: PAYSTACK_SECRET_KEY not found in backend/.env")
    sys.exit(1)

def simulate_webhook(transfer_code, status):
    """
    Sends a perfectly signed Paystack webhook to your local server.
    Status should be 'success', 'failed', or 'reversed'.
    """
    event = f"transfer.{status}"
    
    payload = {
        "event": event,
        "data": {
            "id": 123456789,
            "domain": "test",
            "amount": 500000,
            "currency": "NGN",
            "reference": "TEST_REF_123",
            "status": status,
            "transfer_code": transfer_code,
            "reason": "Simulated failure from test script" if status != "success" else ""
        }
    }
    
    body = json.dumps(payload)
    
    # Generate the HMAC SHA512 signature using the secret key
    signature = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        body.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()

    headers = {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature
    }

    url = 'http://localhost:8000/api/payments/paystack/webhook/'
    print(f"Sending {event} webhook for {transfer_code} to {url}...")
    
    try:
        res = requests.post(url, data=body, headers=headers)
        print(f"Response Status: {res.status_code}")
        if res.status_code == 200:
            print(f"✅ Success! The webhook was accepted by your backend.")
            if status == "success":
                print("Go check the frontend: Payout should be SUCCESSFUL and Total Earnings updated.")
            else:
                print("Go check the frontend: Payout should be FAILED and the balance should be refunded.")
        else:
            print(f"❌ Error: {res.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to localhost:8000. Is your Django server running?")

if __name__ == "__main__":
    print("=== CirclePass Paystack Webhook Simulator ===")
    transfer_code = input("Enter the transfer code (e.g. TRF_1a2b3c4d) from your Django admin or DB: ").strip()
    
    if not transfer_code:
        print("Transfer code is required.")
        sys.exit(1)
        
    print("\nSelect outcome to simulate:")
    print("1. Success (transfer.success)")
    print("2. Failed (transfer.failed - refunds balance)")
    print("3. Reversed (transfer.reversed - refunds balance)")
    
    choice = input("Choice (1/2/3): ").strip()
    
    status_map = {"1": "success", "2": "failed", "3": "reversed"}
    status = status_map.get(choice)
    
    if not status:
        print("Invalid choice.")
        sys.exit(1)
        
    simulate_webhook(transfer_code, status)
