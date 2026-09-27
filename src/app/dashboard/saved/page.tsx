"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bookmark, Calendar, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { API_URL } from "@/lib/api/config";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export default function SavedEventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${API}/saved-events/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Saved Events</h1>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
              <div className="h-32 bg-muted rounded-xl mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No saved events yet</h3>
          <p className="text-muted-foreground mb-6">Events you bookmark will appear here.</p>
          <Link href="/events" className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Discover Events
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((item: any) => {
            const event = item.event || item;
            return (
              <Link key={event.id || item.id} href={`/events/${event.slug || event.id}`} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all">
                <div className="relative h-40 bg-muted">
                  {event.cover_image && (
                    <Image 
                      src={
                        typeof event.cover_image === 'string' 
                          ? event.cover_image.startsWith('http://localhost:')
                            ? event.cover_image.replace('http://localhost:', 'http://127.0.0.1:')
                            : event.cover_image.startsWith('/media/')
                              ? `${API_URL?.replace('/api', '') || 'http://127.0.0.1:8000'}${event.cover_image}`
                              : !event.cover_image.startsWith('http') && !event.cover_image.startsWith('/')
                                ? `${API_URL?.replace('/api', '') || 'http://127.0.0.1:8000'}/media/${event.cover_image}`
                                : event.cover_image
                          : event.cover_image
                      } 
                      alt={event.title} 
                      fill 
                      className="object-cover" 
                    />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-1">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>{event.start_time ? new Date(event.start_time).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : 'TBD'}</span>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{event.venue_name}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
