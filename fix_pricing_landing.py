with open(r'src/components/sections/Pricing.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('      <div className="absolute inset-0 bg-white/90 dark:bg-black/90 z-0" />\n', '')

with open(r'src/components/sections/Pricing.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
