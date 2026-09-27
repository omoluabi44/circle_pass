"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Music, Mic, Trophy, Sparkles, Wine, Briefcase } from 'lucide-react';

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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
              Turn Up the Volume
            </h2>
            <Link href="#" className="text-primary hover:text-primary/80 font-medium text-sm md:text-base flex items-center gap-1 transition-colors">
              View All <span>&rarr;</span>
            </Link>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {partyCategories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <Link href="#" key={index} className="group relative w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-foreground border border-border hover:border-primary/50 transition-all duration-300 block shadow-sm hover:shadow-xl">
                  <Image
                    src={cat.img}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                  />
                  {/* Bottom Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                  {/* Content block */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <div className="bg-black/50 backdrop-blur-xl rounded-xl p-3 md:p-4 border border-primary-foreground/10 group-hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <h3 className="font-semibold text-base md:text-lg text-primary-foreground">{cat.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-xs font-medium">{cat.sub}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🚀 BOTTOM SECTION: PROFESSIONAL SETTINGS 🚀 */}
      <div className="pt-12 pb-24 px-4 md:px-8 bg-secondary/30 border-t border-border">
        <div className="container mx-auto max-w-7xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
              Business and Professional Events
            </h2>
            <Link href="#" className="text-primary hover:text-primary/80 font-medium text-sm md:text-base flex items-center gap-1 transition-colors">
              View All <span>&rarr;</span>
            </Link>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {professionalCategories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <Link href="#" key={index} className="group relative w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-foreground border border-border hover:border-primary/50 transition-all duration-300 block shadow-sm hover:shadow-xl">
                  <Image
                    src={cat.img}
                    alt={cat.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                  />
                  {/* Bottom Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                  {/* Content block */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <div className="bg-black/50 backdrop-blur-xl rounded-xl p-3 md:p-4 border border-primary-foreground/10 group-hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <h3 className="font-semibold text-base md:text-lg text-primary-foreground">{cat.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-xs font-medium">{cat.sub}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}
