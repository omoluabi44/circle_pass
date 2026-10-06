import re
with open(r'src/app/organizer/wallet/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'Minimum .1,000', 'Minimum ?100', text)

with open(r'src/app/organizer/wallet/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
