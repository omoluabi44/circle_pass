with open(r'src/app/pricing/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('        </p>\n      </section>', '        </p>\n      </div>\n      </section>')
with open(r'src/app/pricing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open(r'src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace('          </div>\n        </section>\n\n      {/* Footer / Contact */}', '          </div>\n        </div>\n        </section>\n\n      {/* Footer / Contact */}')
with open(r'src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text2)
print("Replaced")
