with open(r'src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('blur-xl scale-110', 'blur-md scale-110')

with open(r'src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
