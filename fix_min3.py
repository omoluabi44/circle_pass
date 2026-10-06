with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('type="number" min="1000" step="100"', 'type="number" min="100" step="100"')
text = text.replace('Minimum ?1,000', 'Minimum ?100')

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
