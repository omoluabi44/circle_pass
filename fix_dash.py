import re

with open("src/app/dashboard/layout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'<img src="/logo\.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />',
    r'<Link href="/"><img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" /></Link>',
    content
)

with open("src/app/dashboard/layout.tsx", "w", encoding="utf-8") as f:
    f.write(content)
