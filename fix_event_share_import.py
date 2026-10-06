with open(r'src/app/events/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("} , QrCode } from", ", QrCode } from")

with open(r'src/app/events/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
