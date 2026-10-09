import os
import re

files_to_check = ['src/components/layout/Footer.tsx', 'src/components/layout/FooterNewsletter.tsx']

for file in files_to_check:
    with open(file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Change any text-foreground/90 or text-foreground to text-white
    text = re.sub(r'text-foreground/90', 'text-white/80', text)
    text = re.sub(r'text-foreground', 'text-white', text)
    text = re.sub(r'text-muted-foreground', 'text-white/80', text)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(text)

print("Replaced footer text colors to pure white")
