with open('src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                  <h3 className="font-bold text-lg text-foreground truncate mb-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>"""

replacement = """                  <h3 className="font-bold text-lg text-foreground uppercase truncate mb-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>"""

if target in text:
    text = text.replace(target, replacement)
    with open('src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
