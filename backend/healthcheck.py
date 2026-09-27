import urllib.request
try:
    r = urllib.request.urlopen('http://127.0.0.1:8000/api/events/')
    print('Backend OK, status:', r.status)
except Exception as e:
    print('Backend DOWN:', e)

try:
    r2 = urllib.request.urlopen('http://127.0.0.1:8000/api/tickets/')
    print('Tickets endpoint OK, status:', r2.status)
except urllib.error.HTTPError as e:
    print('Tickets endpoint HTTP error:', e.code, e.reason)
except Exception as e:
    print('Tickets endpoint error:', e)
