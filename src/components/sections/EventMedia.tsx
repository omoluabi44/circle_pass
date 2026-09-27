import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export function EventMedia() {
  const mediaImages = [
    "/image-folders/IMG-20260917-WA0007.jpg",
    "/image-folders/IMG-20260917-WA0009.jpg",
    "/image-folders/IMG-20260917-WA0011.jpg",
    "/image-folders/IMG-20260917-WA0021.jpg",
    "/image-folders/IMG-20260917-WA0022.jpg",
    "/image-folders/IMG-20260917-WA0024.jpg",
    "/image-folders/photo_2026-09-23_15-04-41.jpg", // Reuse to fill 9 slots
    "/image-folders/IMG_0777.jpg",
    "/image-folders/IMG_0781.jpg",
  ];



  return (
    <section className="py-24 px-4 bg-secondary/10">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-primary/5 border border-primary/10 shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row items-center gap-10 md:gap-16 p-6 md:p-12 lg:p-16">

          {/* Left Side: Photo Grid */}
          <div className="w-full md:w-1/2 shrink-0">
            <div className="grid grid-cols-3 gap-3 md:gap-4 aspect-square">
              {mediaImages.map((src, index) => (
                <div key={index} className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden bg-muted">
                  <Image
                    src={src}
                    alt={`Event media ${index + 1}`}
                    fill
                    className="object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="w-full md:w-1/2 flex flex-col items-start text-left py-4">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-card text-primary text-xs font-bold tracking-widest uppercase mb-6 border border-primary/10 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Event Media
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Relive the <br className="hidden md:block" /> event, together.
            </h2>

            {/* Description */}
            <p className="text-lg md:text-[1.15rem] text-muted-foreground mb-10 leading-relaxed max-w-lg">
              After the night ends, organizers upload photos and videos in one place. Attendees come back to browse, download, and share the moments from events they were part of.
            </p>

            {/* Button */}
            <Link
              href="#"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 group"
            >
              Browse past events
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
