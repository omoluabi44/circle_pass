with open(r'src/components/sections/Hero.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Replace autoPlay with autoPlay muted playsInline
text = re.sub(r'autoPlay\s+loop', 'autoPlay muted playsInline loop', text)
text = re.sub(r'autoPlay\s+onEnded', 'autoPlay muted playsInline onEnded', text)

with open(r'src/components/sections/Hero.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("done")
