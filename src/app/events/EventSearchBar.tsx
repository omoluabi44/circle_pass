"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar } from "lucide-react";

export function EventSearchBar({ initialParams = {} }: { initialParams?: Record<string, any> }) {
  const router = useRouter();
  
  // Initialize state with values from URL search params if present
  const [query, setQuery] = useState(initialParams.q || "");
  const [location, setLocation] = useState(initialParams.location || "any");
  const [date, setDate] = useState(initialParams.date || "any");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (query) params.set("q", query as string);
    if (location && location !== "any") params.set("location", location as string);
    if (date && date !== "any") params.set("date", date as string);
    
    router.push(`/events?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="bg-background rounded-[1.5rem] md:rounded-full p-2 md:p-2.5 shadow-2xl flex flex-col md:flex-row items-center gap-1 max-w-5xl mx-auto border-4 border-white/10 ring-1 ring-border">
      {/* Search Input */}
      <div className="flex items-center flex-[1.5] px-4 py-3 md:py-2 w-full text-foreground">
        <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, artists, or venues..." 
          className="w-full bg-transparent border-none outline-none font-semibold text-[15px] placeholder-muted-foreground/70"
        />
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px h-10 bg-border/80" />

      {/* Location Filter */}
      <div className="flex items-center flex-1 px-4 py-3 md:py-2 w-full text-foreground border-t md:border-t-0 border-border/80">
        <MapPin className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
        <select 
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-transparent border-none outline-none font-semibold text-[15px] text-foreground cursor-pointer appearance-none"
        >
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
        <select 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent border-none outline-none font-semibold text-[15px] text-foreground cursor-pointer appearance-none"
        >
          <option value="any">Any Date</option>
          <option value="today">Today</option>
          <option value="this_weekend">This Weekend</option>
          <option value="this_month">This Month</option>
        </select>
      </div>

      {/* Search Button */}
      <button type="submit" className="w-full md:w-auto bg-primary text-primary-foreground font-extrabold px-8 py-4 md:py-4 rounded-xl md:rounded-full hover:bg-primary/90 transition-all shadow-lg mt-2 md:mt-0 shrink-0 text-[15px] hover:scale-[1.02]">
        Search Events
      </button>
    </form>
  );
}
