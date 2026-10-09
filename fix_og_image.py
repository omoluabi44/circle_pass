with open(r'src/app/events/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """    if (imageUrl) {
      if (!imageUrl.startsWith("http")) {
        // Fallback domain if env variable isn't set
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://circlepass.ng";
        if (imageUrl.startsWith('/media/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://circlepass-production.up.railway.app';
            imageUrl = `${apiBase}${imageUrl}`;
        } else {
            imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
      }
    } else {"""

new_logic = """    if (imageUrl) {
      if (!imageUrl.startsWith("http")) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://circlepass-production.up.railway.app';
        // If it's a relative path from Django, it belongs to the backend media folder
        if (imageUrl.startsWith('/media/')) {
            imageUrl = `${apiBase}${imageUrl}`;
        } else if (!imageUrl.startsWith('/')) {
            // Django sometimes returns just "event_covers/..."
            imageUrl = `${apiBase}/media/${imageUrl}`;
        } else {
            imageUrl = `${apiBase}/media${imageUrl}`;
        }
      }
    } else {"""

text = text.replace(old_logic, new_logic)

with open(r'src/app/events/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
