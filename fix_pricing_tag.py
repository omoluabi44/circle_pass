with open(r'src/components/sections/Pricing.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('border-2 border-primary text-primary font-bold px-6 py-2 rounded-lg mb-8 tracking-wider uppercase', 
                    'border-2 border-white text-white font-bold px-6 py-2 rounded-lg mb-8 tracking-wider uppercase')

with open(r'src/components/sections/Pricing.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
