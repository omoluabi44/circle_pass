import urllib.request, urllib.error

endpoints = [
    'http://127.0.0.1:8000/api/admin/overview/',
    'http://127.0.0.1:8000/api/admin/',
    'http://127.0.0.1:8000/api/',
]

for url in endpoints:
    try:
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer dummy'})
        r = urllib.request.urlopen(req)
        print(f'OK {url} -> {r.status}')
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code} {url} -> {e.reason}')
    except Exception as e:
        print(f'ERROR {url} -> {e}')
