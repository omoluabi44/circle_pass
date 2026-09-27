import urllib.request, json
from urllib.error import HTTPError

# Login
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/jwt/create/', 
    data=json.dumps({'email': 'emmanuelogunleye441999@gmail.com', 'password': 'password123'}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    tokens = json.loads(res.read())
    token = tokens['access']
    print(f"Logged in!")
    
    # Get tickets
    req = urllib.request.Request('http://127.0.0.1:8000/api/tickets/', 
        headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(req)
    tickets = json.loads(res.read())
    if not tickets:
        print("No tickets found!")
    else:
        # Get first ticket
        ticket = tickets[0]
        print(f"Testing fetch for qr_token: {ticket['qr_token']}")
        
        req = urllib.request.Request(f"http://127.0.0.1:8000/api/tickets/{ticket['qr_token']}/", 
            headers={'Authorization': f'Bearer {token}'})
        res = urllib.request.urlopen(req)
        print("SUCCESS!", res.status)
        
except HTTPError as e:
    print(f"ERROR: {e.code}")
    print(e.read())
