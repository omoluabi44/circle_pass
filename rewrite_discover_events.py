with open(r'src/components/sections/DiscoverEvents.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We completely rewrite the DiscoverEvents.tsx file
new_content = """
"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Music, Mic, Trophy, Sparkles, Wine, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true); // default true assuming content overflows

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full">
      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 custom-scrollbar hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Navigation Buttons underneath */}
      <div className="flex items-center justify-center mt-6">
        <div className="flex bg-primary/10 p-1.5 rounded-[1.25rem] gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-14 h-12 flex items-center justify-center rounded-xl transition-all ${canScrollLeft ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' : 'bg-transparent text-primary/40'}`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-14 h-12 flex items-center justify-center rounded-xl transition-all ${canScrollRight ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' : 'bg-transparent text-primary/40'}`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Single category card
function CategoryCard({ cat }: { cat: { name: string; sub: string; img: string; icon: React.ComponentType<{ className?: string }> } }) {
  const Icon = cat.icon;
  return (
    <div className="shrink-0 snap-start w-[160px] sm:w-[180px] md:w-[220px] lg:w-[240px]">
      <Link
        href={`/events?category=${cat.name.toUpperCase()}`}
        className="group relative block w-full aspect-[3/4.5] rounded-3xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl"
      >
        <img
          src={cat.img}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Bottom Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content block aligned exactly like mockup */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-white/90" />
            <h3 className="font-bold text-lg text-white">{cat.name}</h3>
          </div>
          <p className="text-white/70 text-sm font-medium pl-7">{cat.sub}</p>
        </div>
      </Link>
    </div>
  );
}

export function DiscoverEvents() {
  const allCategories = [
    { name: "Music", sub: "348 events", img: "/image-folders/music/IMG_0784.jpg", icon: Music },
    { name: "Comedy", sub: "192 events", img: "/image-folders/commedy/IMG_0780.jpg", icon: Mic },
    { name: "Sports", sub: "156 events", img: "/image-folders/football/IMG_0786.jpg", icon: Trophy },
    { name: "Festivals", sub: "121 events", img: "/image-folders/festival/IMG_0772.jpg", icon: Sparkles },
    { name: "Socials", sub: "98 events", img: "/image-folders/nightlife/IMG_0775.jpg", icon: Wine },
    { name: "Tech", sub: "45 events", img: "/image-folders/tech/IMG_4478.JPG", icon: Briefcase },
    { name: "Conference", sub: "32 events", img: "/image-folders/conference/IMG_4477.JPG", icon: Briefcase },
    { name: "Seminar", sub: "28 events", img: "/image-folders/seminar/IMG_4479.JPG", icon: Briefcase },
  ];

  return (
    <section id="events" className="w-full bg-background pt-24 pb-20 px-4 md:px-8">
      <div className="container mx-auto max-w-7xl">
        
        {/* Header - Matching Mockup */}
        <div className="mb-10 flex flex-col items-start border-l-4 border-primary pl-4 md:pl-5">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">
            What sparks your interest?
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg font-medium">
            Find events that match your vibe.
          </p>
        </div>

        {/* Single Horizontal Carousel for all categories */}
        <HorizontalCarousel>
          {allCategories.map((cat, index) => (
            <CategoryCard key={index} cat={cat} />
          ))}
        </HorizontalCarousel>

      </div>
    </section>
  );
}
"""

with open(r'src/components/sections/DiscoverEvents.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Replaced")
