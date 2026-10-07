with open(r'src/components/sections/Pricing.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('url("/circlepass_bg.png")', 'url("/pricing_section.JPG")')

with open(r'src/components/sections/Pricing.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
