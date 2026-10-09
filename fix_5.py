with open("src/components/sections/SimpleWay.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("style={{ backgroundImage: 'url(\"/circlepass_bg.png\")' }}", "")
content = content.replace("bg-cover bg-center bg-no-repeat", "bg-background")
content = content.replace("<div className=\"absolute inset-0 bg-background/85 z-0\" />", "")
content = content.replace("<div className=\"absolute inset-0 bg-primary/10 z-0\" />", "")

with open("src/components/sections/SimpleWay.tsx", "w", encoding="utf-8") as f:
    f.write(content)
