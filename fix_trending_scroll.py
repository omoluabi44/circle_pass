with open('src/components/sections/TrendingEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = """        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingEvents.map((event) => (
            <Link href={`/events/${event.slug}`} key={event.id} className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300">"""

replacement1 = """        {/* Grid (Desktop) / Scroll (Mobile) */}
        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {trendingEvents.map((event) => (
            <Link href={`/events/${event.slug}`} key={event.id} className="shrink-0 snap-start w-[85vw] sm:w-[60vw] md:w-auto group flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300">"""

if target1 in text:
    text = text.replace(target1, replacement1)
    with open('src/components/sections/TrendingEvents.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
