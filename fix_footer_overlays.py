import re

with open("src/components/layout/Footer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<div className=\"absolute inset-0 bg-background/90 z-0\" />", "")
content = content.replace("<div className=\"absolute inset-0 bg-primary/10 z-0\" />", "")

with open("src/components/layout/Footer.tsx", "w", encoding="utf-8") as f:
    f.write(content)
