with open(r'src/components/sections/Features.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('bg-[#F8FAFC]', 'bg-secondary/20')
text = text.replace('bg-white', 'bg-card')
text = text.replace('text-[#0B1021]', 'text-foreground')

with open(r'src/components/sections/Features.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced Features")
