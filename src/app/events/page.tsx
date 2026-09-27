import { Search, MapPin, Calendar } from "lucide-react";
import { DiscoverySection } from "@/components/sections/DiscoverySection";

export default function EventsPage() {
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
          <div className="bg-background rounded-[1.5rem] md:rounded-full p-2 md:p-2.5 shadow-2xl flex flex-col md:flex-row items-center gap-1 max-w-5xl mx-auto border-4 border-white/10 ring-1 ring-border">
            
            {/* Search Input */}
            <div className="flex items-center flex-[1.5] px-4 py-3 md:py-2 w-full text-foreground">
              <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <input 
                type="text" 
                placeholder="Search events, artists, or venues..." 
                className="w-full bg-transparent border-none outline-none font-semibold text-[15px] placeholder-muted-foreground/70"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-border/80" />

            {/* Location Filter */}
            <div className="flex items-center flex-1 px-4 py-3 md:py-2 w-full text-foreground border-t md:border-t-0 border-border/80">
              <MapPin className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <select className="w-full bg-transparent border-none outline-none font-semibold text-[15px] text-foreground cursor-pointer appearance-none">
                <option value="any">Any Location</option>
                <option value="lagos">Lagos, Nigeria</option>
                <option value="abuja">Abuja, Nigeria</option>
                <option value="accra">Accra, Ghana</option>
              </select>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-border/80" />

            {/* Date Filter */}
            <div className="flex items-center flex-1 px-4 py-3 md:py-2 w-full text-foreground border-t md:border-t-0 border-border/80">
              <Calendar className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <select className="w-full bg-transparent border-none outline-none font-semibold text-[15px] text-foreground cursor-pointer appearance-none">
                <option value="any">Any Date</option>
                <option value="today">Today</option>
                <option value="this_weekend">This Weekend</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            {/* Search Button */}
            <button className="w-full md:w-auto bg-primary text-primary-foreground font-extrabold px-8 py-4 md:py-4 rounded-xl md:rounded-full hover:bg-primary/90 transition-all shadow-lg mt-2 md:mt-0 shrink-0 text-[15px] hover:scale-[1.02]">
              Search Events
            </button>
          </div>
        </div>
      </div>

      {/* Discovery Section loaded below */}
      <div className="-mt-8 relative z-20">
        <DiscoverySection />
      </div>
    </div>
  );
}
