with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('amountKobo >= 100_000', 'amountKobo >= 10_000')

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
