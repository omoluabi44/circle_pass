with open(r'backend/api/views_payout.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("if amount_kobo < 100_000:  # Minimum", "if amount_kobo < 10_000:  # Minimum")
text = text.replace("detail': 'Minimum withdrawal amount is ?1,000.'", "detail': 'Minimum withdrawal amount is ?100.'")

with open(r'backend/api/views_payout.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
