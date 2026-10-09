with open(r'src/components/sections/Pricing.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('text-foreground mb-16', 'text-white mb-16')

with open(r'src/components/sections/Pricing.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
