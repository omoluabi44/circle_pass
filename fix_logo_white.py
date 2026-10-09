with open(r'src/components/ui/Logo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('textClassName?: string;', 'textClassName?: string;\n  imageSrc?: string;')
text = text.replace('textClassName = "text-xl tracking-tight text-logo font-logo whitespace-nowrap"', 'textClassName = "text-xl tracking-tight text-logo font-logo whitespace-nowrap",\n  imageSrc = "/logo.png"')
text = text.replace('src="/logo.png"', 'src={imageSrc}')

with open(r'src/components/ui/Logo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open(r'src/components/layout/Footer.tsx', 'r', encoding='utf-8') as f:
    footer_text = f.read()

footer_text = footer_text.replace('<Logo className="flex items-center space-x-2" textClassName="text-xl tracking-tight text-white font-logo whitespace-nowrap" />', '<Logo className="flex items-center space-x-2" textClassName="text-xl tracking-tight text-white font-logo whitespace-nowrap" imageSrc="/logo_white.PNG" />')

with open(r'src/components/layout/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(footer_text)

print("Updated Logo and Footer")
