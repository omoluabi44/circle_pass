with open(r'src/app/pricing/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('          </p>\n      </section>', '          </p>\n        </div>\n      </section>')

with open(r'src/app/pricing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
