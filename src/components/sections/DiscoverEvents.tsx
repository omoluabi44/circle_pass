"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Music, Mic, Trophy, Sparkles, Wine, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Horizontal scroll carousel wrapper ───
function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    <div className="relative group/carousel">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 -translate-x-1/2 md:translate-x-0"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 hide-scrollbar"
      >
        {children}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 translate-x-1/2 md:translate-x-0"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ─── Single category card ───
function CategoryCard({ cat }: { cat: { name: string; sub: string; img: string; icon: React.ComponentType<{ className?: string }> } }) {
  const Icon = cat.icon;
  return (
    <div className="shrink-0 snap-start w-[160px] sm:w-[180px] md:w-[220px] lg:w-[260px]">
      <Link
        href="#"
        className="group relative block w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cat.img}
          alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Bottom Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Content block */}
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
          <div className="bg-black/50 backdrop-blur-xl rounded-lg p-2 md:p-3 border border-primary-foreground/10 group-hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <h3 className="font-semibold text-sm md:text-base text-primary-foreground">{cat.name}</h3>
            </div>
            <p className="text-muted-foreground text-[10px] md:text-xs font-medium">{cat.sub}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function DiscoverEvents() {
  const partyCategories = [
    { name: "Music", sub: "Live concerts & festivals", img: "/image-folders/music/IMG_0784.jpg", icon: Music },
    { name: "Comedy", sub: "Stand-up & shows", img: "/image-folders/commedy/IMG_0780.jpg", icon: Mic },
    { name: "Sports", sub: "Games & matches", img: "/image-folders/football/IMG_0786.jpg", icon: Trophy },
    { name: "Festivals", sub: "Live concerts & festivals", img: "/image-folders/festival/IMG_0772.jpg", icon: Sparkles },
    { name: "Nightlife", sub: "Clubs & parties", img: "/image-folders/nightlife/IMG_0775.jpg", icon: Wine },
  ];

  const professionalCategories = [
    { name: "Tech", sub: "Conferences & Meetups", img: "/image-folders/tech/IMG_4478.JPG", icon: Briefcase },
    { name: "Conference", sub: "Industry summits & networking", img: "/image-folders/conference/IMG_4477.JPG", icon: Briefcase },
    { name: "Seminar", sub: "Workshops & expert talks", img: "/image-folders/seminar/IMG_4479.jpg", icon: Briefcase },
  ];

  return (
    <section id="events" className="w-full bg-background">

      {/* 🚀 TOP SECTION: TURN UP THE VOLUME 🚀 */}
      <div className="pt-24 pb-12 px-4 md:px-8">
        <div className="container mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8">
            <h2 className="inline-block text-xl md:text-2xl font-bold tracking-tight bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
              Turn Up the Volume
            </h2>
          </div>

          {/* Horizontal Carousel */}
          <HorizontalCarousel>
            {partyCategories.map((cat, index) => (
              <CategoryCard key={index} cat={cat} />
            ))}
          </HorizontalCarousel>
        </div>
      </div>

      {/* 🚀 BOTTOM SECTION: PROFESSIONAL SETTINGS 🚀 */}
      <div className="pt-12 pb-24 px-4 md:px-8 bg-secondary/30 border-t border-border">
        <div className="container mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8">
            <h2 className="inline-block text-xl md:text-2xl font-bold tracking-tight bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
              Business and Professional Events
            </h2>
          </div>

          {/* Horizontal Carousel */}
          <HorizontalCarousel>
            {professionalCategories.map((cat, index) => (
              <CategoryCard key={index} cat={cat} />
            ))}
          </HorizontalCarousel>
        </div>
      </div>

    </section>
  );
}
