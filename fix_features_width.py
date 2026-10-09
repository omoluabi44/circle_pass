import re

with open("src/components/sections/Features.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("min-w-[300px]", "w-[260px] sm:w-[280px] shrink-0")
content = content.replace("md:min-w-0", "md:w-auto md:shrink")

with open("src/components/sections/Features.tsx", "w", encoding="utf-8") as f:
    f.write(content)
