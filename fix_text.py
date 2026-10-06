with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<span>All time revenue</span>', '<span>Total net earnings</span>')

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
