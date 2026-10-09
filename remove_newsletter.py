with open(r'src/app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { Newsletter } from "@/components/sections/Newsletter";\n', '')
text = text.replace('      <Newsletter />\n', '')

with open(r'src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Removed Newsletter from page.tsx")
