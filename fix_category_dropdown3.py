with open(r'src/app/organizer/events/create/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """{categories.filter((cat: any) => ["Music", "Comedy", "Sports", "Festivals", "Nightlife", "Tech", "Technology", "Conference", "Seminar"].includes(cat.name)).map((cat: any) => ("""

replacement = """{categories.filter((cat: any) => ["Music", "Comedy", "Sports", "Sport", "Festivals", "Festival", "Nightlife", "Tech", "Technology", "Conference", "Seminar"].includes(cat.name)).map((cat: any) => ("""

if target in text:
    text = text.replace(target, replacement)
    with open(r'src/app/organizer/events/create/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
