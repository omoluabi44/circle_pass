with open(r'src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Footer / Contact */}' in line:
        lines.insert(i-1, '        </div>\n')
        break

with open(r'src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Replaced")
