with open(r'src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(
    r'<section className="w-full bg-brand-gradient([^"]+)">', 
    r'<section className="w-full bg-cover bg-center bg-no-repeat\1" style={{ backgroundImage: "url(\'/trendingEventBG.PNG\')" }}>', 
    text
)

with open(r'src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
