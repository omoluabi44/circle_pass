with open(r'src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('      </section>\n        </div>', '        </div>\n      </section>')

with open(r'src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
