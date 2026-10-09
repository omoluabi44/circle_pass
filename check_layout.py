with open("src/app/organizer/layout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("return (")
print(content[idx:idx+1500])
