with open(r'src/components/layout/Footer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<Logo className="flex items-center space-x-2" />', '<Logo className="flex items-center space-x-2" textClassName="text-xl tracking-tight text-white font-logo whitespace-nowrap" />')

with open(r'src/components/layout/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced Logo text to white")
