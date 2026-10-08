import { DiscoverySection } from "@/components/sections/DiscoverySection";
import { EventSearchBar } from "./EventSearchBar";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      {/* Massive Search & Filter Header */}
      <div className="text-background pt-32 pb-36 px-4 relative overflow-hidden">
        <video
          src="/video1.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-black/70 z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent opacity-60 mix-blend-screen z-0" />
        
        <div className="container mx-auto max-w-6xl relative z-10 mt-8">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight text-center text-white">
            Find your next experience.
          </h1>
          <p className="text-lg md:text-xl text-white/70 text-center mb-12 max-w-2xl mx-auto font-medium">
            Search thousands of events, festivals, parties, and conferences happening around you.
          </p>

          {/* Big Search Bar Form */}
          <EventSearchBar initialParams={resolvedParams} />
        </div>

        {/* Scroll indicator for mobile */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-bounce">
          <span className="text-white/60 text-xs font-medium mb-1 uppercase tracking-widest">Scroll</span>
          <svg className="w-5 h-5 text-white/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>

      {/* Discovery Section loaded below */}
      <div className="-mt-8 relative z-20">
        <DiscoverySection searchParams={resolvedParams as Record<string, string>} />
      </div>
    </div>
  );
}
