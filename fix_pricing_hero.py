with open(r'src/app/pricing/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Find the entire hero section and replace it cleanly
old = '''      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 w-full bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: "url(\\'/paid_event_pricing_page.PNG\\')" }}><div className="max-w-7xl mx-auto text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold font-logo text-primary mb-6">
          Simple pricing. No surprises.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-2">
          Create and manage free events at no cost.
        </p>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          For paid events, CirclePass charges a simple <span className="font-semibold text-foreground">5% service fee per paid ticket</span>.
        </p>
      </div>
      </section>'''

new = '''      {/* Hero Section */}
      <section
        className="pt-24 pb-16 px-4 w-full bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: "url('/paid_event_pricing_page.PNG')" }}
      >
        <div className="absolute inset-0 bg-black/40 z-0" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-logo text-white mb-6">
            Simple pricing. No surprises.
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-2">
            Create and manage free events at no cost.
          </p>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            For paid events, CirclePass charges a simple <span className="font-semibold text-white">5% service fee per paid ticket</span>.
          </p>
        </div>
      </section>'''

if old in text:
    text = text.replace(old, new)
    print("FOUND and replaced")
else:
    print("NOT FOUND - showing actual content:")
    # Find the hero section lines
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if 'Hero Section' in line or 'paid_event_pricing' in line:
            print(f"Line {i}: {repr(line)}")

with open(r'src/app/pricing/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
