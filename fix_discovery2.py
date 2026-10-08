with open(r'src/components/sections/DiscoverySection.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the filter slice logic
text = text.replace(
    '}).slice(0, 4); // Force exactly 4 events max based on sketch constraints',
    '}).slice(0, limit || undefined);'
)

# Replace the CTA Button logic
cta_button = """      {/* CTA Button */}
      <Link 
        href="/events"
        className="inline-flex items-center justify-center px-10 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md text-lg"
      >
        See all events
      </Link>"""

new_cta = """      {/* CTA Button */}
      {limit && (
        <Link 
          href="/events"
          className="inline-flex items-center justify-center px-10 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md text-lg"
        >
          See all events
        </Link>
      )}"""

text = text.replace(cta_button, new_cta)

with open(r'src/components/sections/DiscoverySection.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced")
