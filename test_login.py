import urllib.request, json
from urllib.error import HTTPError
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/jwt/create/', 
    data=json.dumps({'email': 'admin2@example.com', 'password': 'password123'}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    print(res.status, res.read())
except HTTPError as e:
    print(e.code, e.read())
