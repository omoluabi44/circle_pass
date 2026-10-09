import re

with open("src/app/pricing/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_section = """      {/* No Subscription Section */}
      <section className="bg-secondary/50 py-16 px-4 mb-20 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">No Monthly Subscription</h2>
          <p className="text-lg text-muted-foreground mb-4">
            There's no monthly subscription or setup fee to use CirclePass. You pay the CirclePass service fee when you sell paid tickets.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Payment processing fees are inclusive.
          </p>
        </div>
      </section>"""

new_section = """      {/* No Subscription Section */}
      <section 
        className="py-16 px-4 mb-20 border-y border-border bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background_A.jpg')" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">No Monthly Subscription</h2>
          <p className="text-lg text-white/90 mb-4">
            There's no monthly subscription or setup fee to use CirclePass. You pay the CirclePass service fee when you sell paid tickets.
          </p>
          <p className="text-sm text-white/70 italic">
            Payment processing fees are inclusive.
          </p>
        </div>
      </section>"""

if old_section in content:
    content = content.replace(old_section, new_section)
    with open("src/app/pricing/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully.")
else:
    print("Old section not found. Trying regex.")
    
