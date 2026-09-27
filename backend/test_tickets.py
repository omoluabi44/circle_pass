import urllib.request
try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/tickets/', headers={'Authorization': 'Bearer dummy', 'Origin': 'http://localhost:3000'})
    r = urllib.request.urlopen(req)
    print('Tickets endpoint OK, status:', r.status)
except urllib.error.HTTPError as e:
    print('Tickets endpoint HTTP error:', e.code, e.reason)
    print('Headers:', e.headers)
except Exception as e:
    print('Tickets endpoint error:', e)
