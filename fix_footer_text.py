import os

files_to_check = ['src/components/layout/Footer.tsx', 'src/components/layout/FooterNewsletter.tsx']

for file in files_to_check:
    with open(file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    text = text.replace('text-muted-foreground', 'text-foreground/90')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(text)

print("Replaced footer text colors")
