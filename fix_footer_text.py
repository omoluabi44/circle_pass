with open(r'src/components/layout/Footer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<p className="text-muted-foreground text-sm max-w-xs">',
    '<p className="text-muted-foreground text-sm max-w-xs hidden md:block">'
)

with open(r'src/components/layout/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
