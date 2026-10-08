with open(r'src/components/sections/DiscoverySection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_cta = """        {/* CTA Button */}
        <Link 
          href="/events"
          className="inline-flex items-center justify-center px-10 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md text-lg"
        >
          See all events
        </Link>"""

new_cta = """        {/* CTA Button */}
        {limit && (
          <Link 
            href="/events"
            className="inline-flex items-center justify-center px-10 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md text-lg"
          >
            See all events
          </Link>
        )}"""

text = text.replace(old_cta, new_cta)

with open(r'src/components/sections/DiscoverySection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
