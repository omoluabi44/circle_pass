import re

with open("src/app/about/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Card 1: Experience First
old_card1 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Experience First</h4>
            <p className="text-muted-foreground text-sm">The ticket is part of the journey, not the whole journey. Everything we build starts with the experience.</p>
          </div>"""

new_card1 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl flex flex-col text-left group shadow-sm overflow-hidden">
            <div className="relative w-full h-40 sm:h-48">
              <Image src="/image-folders/about us page/experience_first.JPG" alt="Experience First" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">Experience First</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">The ticket is part of the journey, not the whole journey. Everything we build starts with the experience.</p>
            </div>
          </div>"""

content = content.replace(old_card1, new_card1)

# Card 2: Simple by Design
old_card2 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Simple by Design</h4>
            <p className="text-muted-foreground text-sm">The important things shouldn't feel complicated. From creating an event to getting through the door, we keep the journey clear.</p>
          </div>"""

new_card2 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl flex flex-col text-left group shadow-sm overflow-hidden">
            <div className="relative w-full h-40 sm:h-48">
              <Image src="/image-folders/about us page/simple_by_design.PNG" alt="Simple by Design" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">Simple by Design</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">The important things shouldn't feel complicated. From creating an event to getting through the door, we keep the journey clear.</p>
            </div>
          </div>"""

content = content.replace(old_card2, new_card2)

# Card 3: Built for Both Sides
old_card3 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Built for Both Sides</h4>
            <p className="text-muted-foreground text-sm">Great events need great organizers and great experiences for attendees. We build with both in mind.</p>
          </div>"""

new_card3 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl flex flex-col text-left group shadow-sm overflow-hidden">
            <div className="relative w-full h-40 sm:h-48">
              <Image src="/image-folders/about us page/built_for_both_side.PNG" alt="Built for Both Sides" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">Built for Both Sides</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">Great events need great organizers and great experiences for attendees. We build with both in mind.</p>
            </div>
          </div>"""

content = content.replace(old_card3, new_card3)

# Card 4: Always Evolving
old_card4 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl aspect-square flex flex-col p-8 text-left group shadow-sm">
            <h4 className="font-bold text-xl mb-4 group-hover:text-primary transition-colors">Always Evolving</h4>
            <p className="text-muted-foreground text-sm">We listen, learn, improve, and keep building around what people actually need.</p>
          </div>"""

new_card4 = """<div className="bg-background border border-border hover:border-primary/50 transition-colors rounded-2xl flex flex-col text-left group shadow-sm overflow-hidden">
            <div className="relative w-full h-40 sm:h-48">
              <Image src="/image-folders/about us page/always_evolving.PNG" alt="Always Evolving" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">Always Evolving</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">We listen, learn, improve, and keep building around what people actually need.</p>
            </div>
          </div>"""

content = content.replace(old_card4, new_card4)

with open("src/app/about/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
