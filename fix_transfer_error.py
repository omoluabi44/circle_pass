with open(r'backend/core/utils/transfers.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    response.raise_for_status()

    data = response.json()
    if not data.get('status'):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")"""

replacement = """    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    
    try:
        data = response.json()
    except Exception:
        response.raise_for_status()
        return None
        
    if not data.get('status'):
        raise ValueError(f"Paystack error: {data.get('message', 'Unknown error')}")
        
    response.raise_for_status()"""

if target in text:
    text = text.replace(target, replacement)
    with open(r'backend/core/utils/transfers.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
