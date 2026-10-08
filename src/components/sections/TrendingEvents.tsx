"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, Crown, ShoppingCart, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function TrendingEvents() {
  const { cartItems, addToCart } = useCart();
  const addedItems = cartItems.map(item => item.id);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { getPublicEvents } = await import('@/lib/api/events');
        const data = await getPublicEvents();
        const eventsList = Array.isArray(data) ? data : (data.results || []);
        
        // Filter out past events
        const upcomingEvents = eventsList.filter((e: any) => new Date(e.end_time) > new Date());
        
        const mapped = upcomingEvents.slice(0, 3).map((e: any) => {
          const startDate = new Date(e.start_time);
          const month = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          const day = startDate.toLocaleDateString('en-US', { day: '2-digit' });
          const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
          
          let priceStr = 'Free';
          if (e.ticket_types && e.ticket_types.length > 0) {
             const prices = e.ticket_types.map((t:any) => t.price);
             const minPrice = Math.min(...prices);
             if (minPrice > 0) priceStr = `₦${(minPrice / 100).toLocaleString()}`;
          }

          let imageUrl = e.cover_image || '/image-folders/event-images/photo_2026-09-17_16-13-26.jpg';
          if (typeof imageUrl === 'string') {
            if (imageUrl.startsWith('http://localhost:')) {
              imageUrl = imageUrl.replace('http://localhost:', 'http://127.0.0.1:');
            } else if (imageUrl.startsWith('/media/')) {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
              imageUrl = `${baseUrl}${imageUrl}`;
            } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
              imageUrl = `${baseUrl}/media/${imageUrl}`;
            }
          }

          return {
            id: e.id,
            slug: e.slug || e.id.toString(),
            title: e.title,
            image: imageUrl,
            month,
            day,
            location: e.venue?.name || (e.is_online ? 'Online' : 'TBA'),
            time,
            price: priceStr,
            isSponsored: false,
            status: e.status?.toLowerCase() === 'live' ? 'live' : 'upcoming',
          };
        });
        
        setTrendingEvents(mapped);
      } catch (err) {
        console.error('Failed to fetch trending events:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <section className="w-full bg-cover bg-center bg-no-repeat pt-16 pb-24 px-4 md:px-8 border-t border-border" style={{ backgroundImage: "url(\'/trendingEventBG.PNG\')" }}>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Trending Events
          </h2>
          <Link href="/events" className="text-primary hover:text-primary/80 font-medium text-sm md:text-base flex items-center gap-1 transition-colors">
            See More <span>&rarr;</span>
          </Link>
        </div>

        {/* Grid (Desktop) / Scroll (Mobile) */}
        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 snap-x snap-mandatory custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {trendingEvents.map((event) => (
            <Link href={`/events/${event.slug}`} key={event.id} className="shrink-0 snap-start w-[85vw] sm:w-[60vw] md:w-auto group flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300">
              {/* Image Area */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                {/* Blurred Background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-md scale-110"
                  style={{ backgroundImage: `url(${event.image})` }}
                />
                {/* Main Image */}
                <img 
                  src={event.image}
                  alt={event.title}
                  className="relative w-full h-full object-contain z-10"
                />
                {/* Status Badge */}
                <div className={`absolute z-20 top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 ${
                  event.status === 'live' 
                    ? 'bg-success text-success-foreground' 
                    : 'bg-primary/90 text-primary-foreground'
                }`}>
                  {event.status === 'live' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                  {event.status === 'live' ? 'Live' : 'Upcoming'}
                </div>
                {event.isSponsored && (
                  <div className="absolute z-20 top-4 right-4 bg-warning text-warning-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    Sponsored
                  </div>
                )}
              </div>
              <div className="flex p-5 flex-grow">
                {/* Date Block — Made more visible and bold */}
                <div className="flex flex-col items-center mr-5 shrink-0 pt-1 bg-secondary rounded-xl px-4 py-3">
                  <span className="text-sm font-extrabold text-primary uppercase tracking-wider">{event.month}</span>
                  <span className="text-4xl font-black text-foreground leading-none mt-1">{event.day}</span>
                </div>

                {/* Details */}
                <div className="flex flex-col flex-grow min-w-0">
                  <h3 className="font-bold text-lg text-foreground uppercase truncate mb-2 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-4 h-4 text-primary/70" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock className="w-4 h-4 text-primary/70" />
                      <span className="font-extrabold text-foreground">{event.time}</span>
                    </div>
                  </div>

                  {/* Price and Cart */}
                  <div className="mt-auto flex justify-between items-end pt-4 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Starting at</span>
                      <span className="text-2xl font-black text-foreground leading-none">{event.price}</span>
                    </div>
                    <button 
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        addedItems.includes(event.id) 
                          ? 'bg-primary text-primary-foreground cursor-default' 
                          : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                      }`}
                      aria-label={addedItems.includes(event.id) ? "Added to cart" : "Add to cart"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!addedItems.includes(event.id)) {
                          addToCart({
                            id: event.id,
                            slug: event.slug,
                            title: event.title,
                            image: event.image,
                            price: event.price,
                            date: `${event.month} ${event.day}`,
                            location: event.location,
                          });
                        }
                      }}
                    >
                      {addedItems.includes(event.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
