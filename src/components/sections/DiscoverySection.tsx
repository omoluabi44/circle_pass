"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, ChevronDown } from "lucide-react";

export function DiscoverySection() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [events, setEvents] = useState<any[]>([]);
  const [filters, setFilters] = useState<string[]>(["ALL"]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { getPublicEvents, getCategories } = await import('@/lib/api/events');
        const [eventsData, categoriesData] = await Promise.all([
          getPublicEvents(),
          getCategories()
        ]);
        
        const eventsList = Array.isArray(eventsData) ? eventsData : (eventsData.results || []);
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : (categoriesData.results || []);
        
        const catNames = categoriesList.map((c: any) => c.name.toUpperCase());
        setFilters(["ALL", ...catNames]);

        const mapped = eventsList.map((e: any) => {
          const startDate = new Date(e.start_time);
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
          
          let priceStr = 'Free';
          if (e.ticket_types && e.ticket_types.length > 0) {
             const prices = e.ticket_types.map((t:any) => t.price);
             const minPrice = Math.min(...prices);
             if (minPrice > 0) priceStr = `₦${(minPrice / 100).toLocaleString()}`;
          }

          const isPast = new Date() > new Date(e.end_time);
          
          let imageUrl = e.cover_image || '/image-folders/event-images/photo_2026-09-17_16-13-26.jpg';
          if (typeof imageUrl === 'string') {
            if (imageUrl.startsWith('http://localhost:')) {
              imageUrl = imageUrl.replace('http://localhost:', 'http://127.0.0.1:');
            } else if (imageUrl.startsWith('/media/')) {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
              imageUrl = `${baseUrl}${imageUrl}`;
            }
          }

          const catName = e.category?.name || e.category_name || (typeof e.category === 'string' ? e.category : null);

          return {
            id: e.id,
            slug: e.slug || e.id?.toString() || '',
            title: e.title,
            date: `${dateStr} • ${time}`,
            location: e.venue?.name || (e.is_online ? 'Online' : 'TBA'),
            price: priceStr,
            image: imageUrl,
            category: catName ? catName.toUpperCase() : 'UNRATED',
            status: isPast ? 'past' : 'upcoming'
          };
        });
        
        setEvents(mapped);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredEvents = events.filter(e => {
    if (e.status !== activeTab) return false;
    if (activeFilter !== "ALL" && e.category !== activeFilter) return false;
    return true;
  });

  return (
    <section className="py-24 px-4 bg-muted/30" id="discover">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">Discover.</h2>
          <p className="text-muted-foreground font-medium">Find your next story, events and experiences across the globe.</p>
        </div>

        {/* Location Filter */}
        <div className="mb-8 flex flex-col items-center md:items-start max-w-4xl mx-auto">
          <span className="text-xs text-muted-foreground mb-2 font-medium">Find an event in:</span>
          <button className="flex items-center gap-2 bg-card border border-border/80 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm text-foreground">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Nigeria
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center border-b border-border/60 mb-8 max-w-4xl mx-auto">
          <div className="flex gap-10">
            <button 
              onClick={() => setActiveTab("upcoming")}
              className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === "upcoming" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Upcoming
              {activeTab === "upcoming" && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-primary rounded-t-full"></div>
              )}
            </button>
            <button 
              onClick={() => setActiveTab("past")}
              className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === "past" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Past Events
              {activeTab === "past" && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-primary rounded-t-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-wider transition-all ${
                activeFilter === filter 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-5 max-w-5xl mx-auto">
          {filteredEvents.slice(0, 3).map(event => (
            <Link 
              href={`/events/${event.slug}`}
              key={event.id} 
              className={`bg-card border border-border/60 rounded-[1.25rem] p-4 flex gap-4 transition-all hover:shadow-lg hover:border-border cursor-pointer group ${activeTab === "past" ? "opacity-75 hover:opacity-100 grayscale-[0.2]" : ""}`}
            >
              {/* Content */}
              <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                <div>
                  {activeTab === "past" && (
                    <div className="bg-muted-foreground text-white text-[9px] font-bold px-2 py-0.5 rounded-md mb-2.5 inline-block tracking-wider">
                      ENDED
                    </div>
                  )}
                  <h3 className="font-bold text-[15px] md:text-base text-foreground mb-3 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
                <div className="mt-5 font-extrabold text-foreground text-sm">
                  {event.price}
                </div>
              </div>
              
              {/* Image */}
              <div className="w-[100px] h-[100px] md:w-[130px] md:h-[130px] shrink-0 bg-muted rounded-xl overflow-hidden relative shadow-sm">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          ))}
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No events found in this category.
          </div>
        )}

        {/* CTA Button */}
        {filteredEvents.length > 0 && (
          <div className="flex justify-center mt-12">
            <Link 
              href="/events" 
              className="bg-primary text-primary-foreground font-bold py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              See All Events
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
