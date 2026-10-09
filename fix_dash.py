import re

with open("src/app/dashboard/layout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix mobile logo in dashboard/layout.tsx
old_mobile = """          <div className="flex items-center justify-between">
            <div className="w-10"></div>
            <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />
            <div className="w-10 flex justify-end">"""

new_mobile = """          <div className="flex items-center justify-between">
            <div className="w-10"></div>
            <Link href="/">
              <img src="/logo.png" alt="CirclePass Logo" className="h-8 w-auto object-contain" />
            </Link>
            <div className="w-10 flex justify-end">"""

content = content.replace(old_mobile, new_mobile)

with open("src/app/dashboard/layout.tsx", "w", encoding="utf-8") as f:
    f.write(content)
