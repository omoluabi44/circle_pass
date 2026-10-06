with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('kobo < 100_000', 'kobo < 10_000')

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
