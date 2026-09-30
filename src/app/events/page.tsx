import { DiscoverySection } from "@/components/sections/DiscoverySection";
import { EventSearchBar } from "./EventSearchBar";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      {/* Massive Search & Filter Header */}
      <div 
        className="text-background pt-32 pb-36 px-4 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: 'url("/hero_event_pass.jpg")' }}
      >
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
      </div>

      {/* Discovery Section loaded below */}
      <div className="-mt-8 relative z-20">
        <DiscoverySection searchParams={resolvedParams as Record<string, string>} />
      </div>
    </div>
  );
}
