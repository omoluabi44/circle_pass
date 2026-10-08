with open(r'src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<div className="absolute top-4 right-4 bg-warning text-warning-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">',
    '<div className="absolute z-20 top-4 right-4 bg-warning text-warning-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">'
)

with open(r'src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
