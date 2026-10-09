with open(r'src/app/pricing/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_link = """<Link href="/contact" className="block w-full bg-primary text-primary-foreground text-center font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors">
              Talk to Us
            </Link>"""

new_link = """<a href="https://wa.me/2349135512889" target="_blank" rel="noopener noreferrer" className="block w-full bg-primary text-primary-foreground text-center font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors">
              Talk to Us
            </a>"""

if old_link in text:
    text = text.replace(old_link, new_link)
    with open(r'src/app/pricing/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced")
else:
    print("Old link not found")
