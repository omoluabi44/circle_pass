import re

with open("src/components/sections/DiscoverEvents.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<p className=\"text-white/70 text-sm font-medium pl-7\">{cat.sub}</p>", "")

with open("src/components/sections/DiscoverEvents.tsx", "w", encoding="utf-8") as f:
    f.write(content)
