"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Clock, Share2, Ticket, ArrowLeft, Users, Bookmark, Music2, Link as LinkIcon, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toggleSaveEvent, toggleFollowOrganizer } from "@/lib/api/engagement";
import { API_URL } from "@/lib/api/config";
import { getPublicEvents } from "@/lib/api/events";
import toast from "react-hot-toast";

// Fetch real event details from the backend
export default function EventDetailsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const { data: session } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    // Fetch event details
    const fetchEvent = async () => {
      try {
        const headers: any = {};
        if (session?.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
        }
        const res = await fetch(`${API_URL}/events/?slug=${slug}&public=true`, { 
          cache: 'no-store',
          headers 
        });
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        
        // Handle list response or single object
        const eventData = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
        if (!eventData) throw new Error("Event not found");
        
        if (typeof eventData.cover_image === 'string') {
          if (eventData.cover_image.startsWith('http://localhost:')) {
            eventData.cover_image = eventData.cover_image.replace('http://localhost:', 'http://127.0.0.1:');
          } else if (eventData.cover_image.startsWith('/media/')) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
            eventData.cover_image = `${baseUrl}${eventData.cover_image}`;
          }
        }
        
        setEvent(eventData);
        setIsSaved(eventData.is_saved || false);
        setIsFollowing(eventData.is_followed || false);
        setFollowerCount(eventData.follower_count || 0);

        // Fetch recommendations
        try {
          const recsRes = await getPublicEvents({ limit: 5, upcoming: true });
          const recs = Array.isArray(recsRes) ? recsRes : (recsRes.results || []);
          setRecommendedEvents(recs.filter((e: any) => e.id !== eventData.id).slice(0, 4));
        } catch (e) {
          console.error("Failed to fetch recommendations", e);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session !== undefined) {
      fetchEvent();
    }
  }, [slug, session]);

  const handleSaveEvent = async () => {
    if (!session?.accessToken) {
      router.push("/login");
      return;
    }
    
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    
    try {
      await toggleSaveEvent(Number(event.id), session.accessToken);
    } catch (err) {
      console.error(err);
      setIsSaved(!newIsSaved);
    }
  };

  const handleFollowOrganizer = async () => {
    if (!session?.accessToken) {
      router.push("/login");
      return;
    }
    
    const newIsFollowing = !isFollowing;
    const orgId = event.organizer || event.organizer_id;
    
    if (!orgId) return; // If we don't have the ID, we can't follow
    
    setIsFollowing(newIsFollowing);
    setFollowerCount(prev => newIsFollowing ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      await toggleFollowOrganizer(Number(orgId), session.accessToken);
    } catch (err) {
      console.error(err);
      setIsFollowing(!newIsFollowing);
      setFollowerCount(prev => newIsFollowing ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setIsSendingMessage(true);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ message: messageText })
      });
      if (!res.ok) throw new Error('Failed to send message');
      toast.success("Message sent successfully!");
      setIsMessageModalOpen(false);
      setMessageText("");
    } catch (err) {
      toast.error("Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30">
        <h1 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-8">The event you are looking for does not exist or has been removed.</p>
        <Link href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
          Browse Events
        </Link>
      </div>
    );
  }

  // Format dates
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  
  const dateStr = startDate.toLocaleDateString("en-US", { weekday: 'short', month: 'long', day: 'numeric' });
  const timeStr = `${startDate.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' })}`;

  // Find lowest price
  const prices = event.ticket_types?.map((t: any) => t.price) || [0];
  const lowestPrice = Math.min(...prices);
  const priceStr = lowestPrice === 0 ? "Free" : `From ₦${(lowestPrice / 100).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner (Placeholder Image) */}
      <div className="relative w-full h-[70vh] lg:h-screen bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <Image 
          src={(() => {
            const img = event.cover_image;
            if (!img) return `https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2000`;
            if (img.startsWith('http')) return img;
            // Django ImageField without request context returns "event_covers/..." instead of "/media/event_covers/..."
            const mediaPath = img.startsWith('/media/') ? img : (img.startsWith('/') ? `/media${img}` : `/media/${img}`);
            return `http://127.0.0.1:8000${mediaPath}`;
          })()} 
          alt={event.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute top-6 left-6 z-20">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-background rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                  {event.category?.name || "Event"}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSaveEvent}
                    className="p-2 text-muted-foreground hover:bg-secondary hover:text-primary rounded-full transition"
                    title={isSaved ? "Unsave Event" : "Save Event"}
                  >
                    <Bookmark className={`w-5 h-5 ${isSaved ? "fill-primary text-primary" : ""}`} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setIsShareOpen(!isShareOpen)}
                      className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition" 
                      title="Share Event"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    {isShareOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setIsShareOpen(false);
                            alert("Link copied!");
                          }}
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <LinkIcon className="w-4 h-4 text-muted-foreground" /> Copy Link
                        </button>
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent('Check out this event: ' + window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                        </a>
                        <a 
                          href={`https://www.instagram.com/`} // Instagram doesn't have a direct share URL like this for arbitrary links, so we just link to IG or they copy link.
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <InstagramIcon className="w-4 h-4 text-pink-500" /> Instagram
                        </a>
                        <a 
                          href={`https://www.tiktok.com/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <Music2 className="w-4 h-4 text-foreground" /> TikTok
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight uppercase">
                {event.title}
              </h1>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-secondary rounded-xl text-primary">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{dateStr}</h3>
                    <p className="text-sm text-muted-foreground">{timeStr}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-secondary rounded-xl text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {event.is_online ? "Online Event" : "Physical Venue"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                      {event.is_online ? "Link provided upon registration" : event.venue?.name || "TBA"}
                    </p>
                    {!event.is_online && event.venue?.name && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">About This Event</h2>
              <div className="prose prose-sm sm:prose-base text-muted-foreground max-w-none whitespace-pre-wrap">
                {event.description || "No description provided."}
              </div>
            </div>

          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              
              {/* Graphical Ticket Card */}
              <div className="bg-primary rounded-3xl p-1 relative overflow-hidden shadow-2xl transform transition-transform hover:-translate-y-2 hover:shadow-primary/30 mb-6">
                {/* Pop-out ticket cutouts */}
                <div className="absolute top-1/2 -left-4 w-8 h-8 bg-background rounded-full -translate-y-1/2 z-10" />
                <div className="absolute top-1/2 -right-4 w-8 h-8 bg-background rounded-full -translate-y-1/2 z-10" />
                
                <div className="bg-card h-full w-full rounded-[1.35rem] border border-border/50 relative overflow-hidden">
                  <div className="p-8 border-b-2 border-dashed border-border/60">
                    <div className="text-center mb-4">
                      <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Admit One</p>
                      <p className="text-4xl font-black text-foreground">{priceStr}</p>
                    </div>

                    {(() => {
                      const totalCapacity = event.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity || 0), 0) || 0;
                      const totalSold = event.ticket_types?.reduce((acc: number, t: any) => acc + (t.quantity_sold || 0), 0) || 0;
                      const isSoldOut = Boolean(
                        event.ticket_types &&
                        event.ticket_types.length > 0 &&
                        (
                          (totalCapacity > 0 && totalSold >= totalCapacity) ||
                          event.ticket_types.every((t: any) => t.is_sold_out || (t.quantity > 0 && (t.quantity_sold ?? 0) >= t.quantity))
                        )
                      );
                      const waitlistEnabled = Boolean(event.waitlist_enabled);
                      const isPast = new Date() > new Date(event.end_time);
                      
                      if (event.sales_paused) {
                        return (
                          <button 
                            disabled
                            className="w-full py-4 bg-muted text-muted-foreground rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span className="relative z-10">Sales Paused</span>
                          </button>
                        );
                      } else if (isPast) {
                        return (
                          <button 
                            disabled
                            className="w-full py-4 bg-muted text-muted-foreground rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span className="relative z-10">Event Over</span>
                          </button>
                        );
                      } else if (isSoldOut && waitlistEnabled) {
                        return (
                          <Link 
                            href={`/events/${slug}/checkout`}
                            className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] flex items-center justify-center gap-2 relative overflow-hidden group"
                          >
                            <Ticket className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">Join Waitlist</span>
                          </Link>
                        );
                      } else if (isSoldOut) {
                        return (
                          <button 
                            disabled
                            className="w-full py-4 bg-muted text-muted-foreground rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span className="relative z-10">Sold Out</span>
                          </button>
                        );
                      } else {
                        return (
                          <Link 
                            href={`/events/${slug}/checkout`}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] flex items-center justify-center gap-2 relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                            <Ticket className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">Get Tickets</span>
                          </Link>
                        );
                      }
                    })()}
                  </div>
                  
                  <div className="p-6 bg-secondary/30">
                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Available Tiers
                    </h3>
                    <div className="space-y-4">
                      {event.ticket_types?.map((ticket: any) => (
                        <div key={ticket.id} className="flex flex-col gap-1 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground font-bold">{ticket.name}</span>
                            <span className="font-bold text-primary">
                              {ticket.price === 0 ? "Free" : `₦${(ticket.price / 100).toLocaleString()}`}
                            </span>
                          </div>
                          {ticket.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-secondary/50 rounded-2xl border border-border/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/organizers/${event.organizer || event.organizer_id}`} className="flex items-center gap-4 min-w-0 group cursor-pointer">
                    <div className="w-12 h-12 bg-muted rounded-full overflow-hidden shrink-0 group-hover:ring-2 ring-primary transition-all">
                      {event.organizer_logo ? (
                        <img src={event.organizer_logo} alt={event.organizer_name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Organized by</p>
                      <p className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{event.organizer_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {followerCount} follower{followerCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={handleFollowOrganizer}
                      className={`w-full px-4 py-1.5 rounded-lg text-xs font-bold transition ${isFollowing ? 'bg-secondary-foreground/10 text-foreground' : 'bg-foreground text-background hover:bg-foreground/90'}`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                    <Link href={`/organizers/${event.organizer || event.organizer_id}`} className="w-full text-center px-4 py-1.5 rounded-lg text-xs font-bold border border-border hover:bg-muted transition text-foreground">
                      View Profile
                    </Link>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {event.organizer_instagram && (
                      <a href={event.organizer_instagram.startsWith('http') ? event.organizer_instagram : `https://instagram.com/${event.organizer_instagram}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-pink-500 hover:bg-secondary rounded-full transition">
                        <InstagramIcon className="w-4 h-4" />
                      </a>
                    )}
                    {event.organizer_website && (
                      <a href={event.organizer_website.startsWith('http') ? event.organizer_website : `https://${event.organizer_website}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition">
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (!session?.accessToken) {
                        toast.error("Please login to message the organizer.");
                        router.push("/login");
                        return;
                      }
                      setIsMessageModalOpen(true);
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Message directly
                  </button>
                </div>
              </div>

              {event.whatsapp_group_link && (
                <a 
                  href={event.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 p-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl flex items-center justify-between group hover:bg-[#25D366]/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Join Event WhatsApp Group</p>
                      <p className="text-xs text-muted-foreground">Connect with other attendees</p>
                    </div>
                  </div>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* You may also like section */}
        <div className="pt-12 mt-12 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">You may also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedEvents.length > 0 ? (
              recommendedEvents.map((recEvent) => {
                const recImage = recEvent.cover_image 
                  ? (recEvent.cover_image.startsWith('http') 
                      ? recEvent.cover_image 
                      : `http://127.0.0.1:8000${recEvent.cover_image.startsWith('/media/') ? '' : '/media/'}${recEvent.cover_image}`)
                  : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&q=80";

                return (
                  <Link key={recEvent.id} href={`/events/${recEvent.slug}`} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                    <div className="h-40 bg-muted relative">
                      <img src={recImage} alt={recEvent.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{recEvent.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{recEvent.venue?.name || (recEvent.is_online ? "Online Event" : "TBA")}</p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-muted-foreground col-span-full">No other events right now.</p>
            )}
          </div>
        </div>

      </div>

      {/* Message Organizer Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-xl border border-border">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-primary" /> Message Organizer
            </h3>
            <textarea
              className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition min-h-[120px] mb-4 resize-none"
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsMessageModalOpen(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary text-foreground rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={isSendingMessage || !messageText.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isSendingMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
