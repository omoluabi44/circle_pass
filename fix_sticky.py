import re
import os

files = [
    "src/app/admin/layout.tsx",
    "src/app/dashboard/layout.tsx",
    "src/app/organizer/layout.tsx"
]

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We find the aside tag and ensure it has self-start
    # Also remove any redundant hidden lg:flex since we can just use fixed layout if we wanted to
    # Actually just adding self-start is easiest.
    if "<aside className=\"" in content:
        content = re.sub(r'(<aside className="[^"]*h-screen sticky top-0)([^"]*)(")', r'\1 self-start\2\3', content)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
