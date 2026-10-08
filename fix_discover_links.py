with open(r'src/components/sections/DiscoverEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('href="#"', 'href={`/events?category=${cat.name.toUpperCase()}`}')

with open(r'src/components/sections/DiscoverEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
