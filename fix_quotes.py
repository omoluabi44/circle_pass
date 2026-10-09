with open("src/components/layout/Footer.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("'url('/background_C.jpg')'", "\"url('/background_C.jpg')\"")
with open("src/components/layout/Footer.tsx", "w", encoding="utf-8") as f:
    f.write(content)

with open("src/components/sections/Pricing.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("'url('/background_A.jpg')'", "\"url('/background_A.jpg')\"")
with open("src/components/sections/Pricing.tsx", "w", encoding="utf-8") as f:
    f.write(content)

