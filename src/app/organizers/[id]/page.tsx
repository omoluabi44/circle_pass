"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Music2, MapPin, Calendar, CheckCircle, Link as LinkIcon, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";
import { toggleFollowOrganizer } from "@/lib/api/engagement";

export default function OrganizerProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    // Fetch the organizer profile and their public events.
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/organizers/${id}/`, {
          headers: session?.accessToken ? {
            'Authorization': `Bearer ${session.accessToken}`
          } : undefined
        });
        
        if (!res.ok) throw new Error("Organizer not found");
        const data = await res.json();
        
        setOrganizer(data);
        setFollowerCount(data.follower_count);
        setIsFollowing(data.is_followed);
        
        // Handle images for local dev
        const processImageUrl = (url: string) => {
          if (!url) return url;
          if (url.startsWith('http://localhost:')) {
            return url.replace('http://localhost:', 'http://127.0.0.1:');
          } else if (url.startsWith('/media/')) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
            return `${baseUrl}${url}`;
          } else if (!url.startsWith('http') && !url.startsWith('/')) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
            return `${baseUrl}/media/${url}`;
          }
          return url;
        };

        const parsedEvents = [
          ...(data.upcoming_events || []),
          ...(data.past_events || [])
        ].map((e: any) => ({
          ...e,
          cover_image: processImageUrl(e.cover_image)
        }));

        setEvents(parsedEvents);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (session !== undefined) {
      fetchProfile();
    }
  }, [id, session]);

  const handleFollow = async () => {
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    setFollowerCount(prev => newFollowing ? prev + 1 : Math.max(0, prev - 1));
    
    if (session?.accessToken) {
      try {
        await toggleFollowOrganizer(Number(id), session.accessToken);
      } catch (err) {
        setIsFollowing(!newFollowing);
        setFollowerCount(prev => newFollowing ? Math.max(0, prev - 1) : prev + 1);
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>;
  if (!organizer) return <div className="min-h-screen flex items-center justify-center">Organizer not found</div>;

  const upcomingEvents = events.filter(e => e.status === "upcoming");
  const pastEvents = events.filter(e => e.status === "past");

  const EventCard = ({ event }: { event: any }) => (
    <Link href={`/events/${event.slug || event.id}`} className={`group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all ${event.status === 'past' ? 'opacity-70 grayscale-[0.2]' : ''}`}>
      <div className="h-40 bg-muted relative">
        <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {event.status === 'past' && <div className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Past Event</div>}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-2">{event.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{event.venue_name || "Online"}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen bg-background pb-20 pt-24">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-3xl p-8 mb-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-primary/10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 pt-12">
            <div className="w-32 h-32 bg-background border-4 border-background rounded-full overflow-hidden shrink-0 shadow-md">
              <img src={organizer.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(organizer.name)}&background=6366f1&color=fff&size=128`} alt={organizer.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                <h1 className="text-3xl font-extrabold text-foreground flex items-center justify-center md:justify-start gap-2">
                  {organizer.name}
                  {organizer.is_verified && <CheckCircle className="w-6 h-6 text-primary fill-primary/20" />}
                </h1>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  {organizer.instagram && (
                    <a href={organizer.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition">
                      <InstagramIcon className="w-5 h-5" />
                    </a>
                  )}
                  {organizer.website && (
                    <a href={organizer.website.startsWith('http') ? organizer.website : `https://${organizer.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
                      <LinkIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground mb-4 max-w-lg mx-auto md:mx-0">{organizer.bio}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="text-sm">
                  <span className="font-bold text-foreground">{followerCount}</span> <span className="text-muted-foreground">Followers</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-foreground">{events.length}</span> <span className="text-muted-foreground">Events</span>
                </div>
              </div>
            </div>
            
            <div className="shrink-0 flex gap-3 w-full md:w-auto">
              <Link
                href={`/dashboard/inbox?new=${id}`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-all border border-border"
              >
                <MessageCircle className="w-4 h-4" /> Message
              </Link>
              <button 
                onClick={handleFollow}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-full font-bold transition-all ${isFollowing ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>

        {/* Events Tabs */}
        <div className="space-y-12">
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">Upcoming Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">Past Events</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pastEvents.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
          
          {events.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-secondary/30 rounded-2xl border border-dashed border-border">
              This organizer doesn't have any public events yet.
            </div>
          )}
        </div>
        
      </div>
    </main>
  );
}
