
import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api"
EMAIL = "emmanuelogunleye441999@gmail.com"
PASSWORD = "Password123!"

print(f"Logging in as {EMAIL}...")
res = requests.post(f"{BASE_URL}/auth/jwt/create/", json={"email": EMAIL, "password": PASSWORD})
if not res.ok:
    print("Login failed:", res.status_code, res.text)
    sys.exit(1)

token = res.json()["access"]
headers = {"Authorization": f"Bearer {token}"}
print("Login successful.")

endpoints = [
    ("/organizer/dashboard/", "Dashboard"),
    ("/organizer/wallet/", "Wallet"),
    ("/organizer/payouts/", "Payouts"),
    ("/organizer/contacts/", "Contacts"),
    ("/organizer/followers/", "Followers"),
    ("/organizer/inbox/", "Inbox"),
    ("/organizer/analytics/", "Analytics"),
    ("/events/", "Events"),
    ("/organizer/profile/", "Profile/Account"),
]

for ep, name in endpoints:
    url = f"{BASE_URL}{ep}"
    res = requests.get(url, headers=headers)
    if res.ok:
        print(f"? {name} ({ep}) works. Status: {res.status_code}")
    else:
        print(f"? {name} ({ep}) failed. Status: {res.status_code}. Response: {res.text[:200]}")

