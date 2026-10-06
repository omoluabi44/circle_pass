with open(r'src/app/organizer/events/create/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                  <select className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground"
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="" disabled>Select a category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id || cat.name}>{cat.name}</option>
                    ))}
                  </select>"""

replacement = """                  <select className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground"
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="" disabled>Select a category</option>
                    {categories
                      .filter((cat: any) => ["Music", "Comedy", "Sports", "Festivals", "Nightlife", "Tech", "Technology", "Conference", "Seminar"].includes(cat.name))
                      .map((cat: any) => (
                      <option key={cat.id} value={cat.id || cat.name}>{cat.name}</option>
                    ))}
                  </select>"""

if target in text:
    text = text.replace(target, replacement)
    with open(r'src/app/organizer/events/create/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
