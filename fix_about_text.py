with open(r'src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'CirclePass brings you closer to the experience.\n          </p>',
    'CirclePass brings you closer to the experience.\n          </p>'.replace(
        'text-xl text-muted-foreground', 'text-xl text-white'
    )
)

# Simpler approach - just replace the class directly
import re
text = re.sub(
    r'(<p className="text-xl) text-muted-foreground( max-w-2xl mx-auto">)\s*\n\s*Whether',
    r'\1 text-white\2\n            Whether',
    text
)

with open(r'src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
