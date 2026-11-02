"use client";

import { useEffect, useState } from "react";
import { TicketCheck, Compass, Calendar, MapPin, Clock, ChevronRight, Loader2, Image as ImageIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/AuthContext";
import { API_URL } from "@/lib/api/config";

export default function AttendeeDashboard() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = '/login';
      return;
    }

    const fetchDashboard = async () => {
      const token = (session as any)?.accessToken;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/attendee/dashboard/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch attendee dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    if (session?.accessToken) fetchDashboard();
  }, [session?.accessToken, status]);

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const { upcoming_tickets = 0, saved_events = 0, following = 0, next_event = null, suggested_events = [], waitlist_entries = [], waitlist_count = 0 } = data || {};

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12">
      <header className="pt-4 md:pt-0">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'Attendee'}!
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">Ready for your next experience?</p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
          <p className="text-sm font-bold text-muted-foreground mb-1">Upcoming Events</p>
          <p className="text-3xl font-extrabold text-foreground">{upcoming_tickets}</p>
        </div>
        <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
          <p className="text-sm font-bold text-muted-foreground mb-1">Saved Events</p>
          <p className="text-3xl font-extrabold text-foreground">{saved_events}</p>
        </div>
        <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
          <p className="text-sm font-bold text-muted-foreground mb-1">Following</p>
          <p className="text-3xl font-extrabold text-foreground">{following}</p>
        </div>
        <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
          <p className="text-sm font-bold text-muted-foreground mb-1">Active Waitlists</p>
          <p className="text-3xl font-extrabold text-foreground">{waitlist_count}</p>
        </div>
      </div>

      {/* Hero: Next Upcoming Event */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Up Next For You</h2>
        {next_event ? (
          <div className="bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row gap-6 lg:gap-10 hover:shadow-md transition-shadow group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors"></div>
            
            <div className="relative w-full md:w-56 h-56 rounded-2xl overflow-hidden shrink-0 bg-secondary/50 flex items-center justify-center">
              {next_event.image ? (
                <Image src={next_event.image} alt={next_event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active Ticket
                </span>
                <span className="text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full uppercase tracking-wider">{next_event.ticket_type}</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight line-clamp-2">{next_event.title}</h3>
              <div className="space-y-3 mb-8">
                <p className="text-muted-foreground font-medium flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" /> {next_event.date}
                </p>
                <p className="text-muted-foreground font-medium flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" /> <span className="line-clamp-1">{next_event.location}</span>
                </p>
              </div>
              <div>
                <Link href={`/dashboard/tickets/${next_event.ticket_id}`} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-bold transition-all shadow-sm inline-flex items-center gap-2 hover:scale-[1.02]">
                  <TicketCheck className="w-5 h-5" /> View Digital Ticket
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No upcoming events</h3>
            <p className="text-muted-foreground mb-6">Looks like you don't have any tickets for upcoming events.</p>
            <Link href="/events" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              <Compass className="w-5 h-5" /> Discover Events
            </Link>
          </div>
        )}
      </section>

      {/* Quick Access & Waitlist (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Quick Access</h2>
          <div className="bg-card border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-1">
            <Link href="/dashboard/tickets" className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <TicketCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-[15px]">My Tickets</p>
                  <p className="text-sm text-muted-foreground font-medium">Access all purchased tickets</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-border group-hover:text-primary transition-colors" />
            </Link>
            
            <Link href="/events" className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-[15px]">Discover Events</p>
                  <p className="text-sm text-muted-foreground font-medium">Find your next experience</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-border group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </section>

        <section className="flex flex-col">
          <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Waitlist Activity</h2>
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-warning/10 rounded-full blur-2xl"></div>
            
            {waitlist_entries.length > 0 ? (
              <div className="space-y-4 relative z-10 max-h-[340px] overflow-y-auto pr-1">
                {waitlist_entries.map((entry: any) => {
                  const statusConfig: Record<string, { label: string; badgeClass: string }> = {
                    ACCEPTED: {
                      label: "Approved — Reserved",
                      badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    },
                    PENDING: {
                      label: "Pending Approval",
                      badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    },
                    COMPLETED: {
                      label: "Purchased",
                      badgeClass: "bg-primary/10 text-primary border-primary/20",
                    },
                    DECLINED: {
                      label: "Declined",
                      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
                    },
                    EXPIRED: {
                      label: "Expired",
                      badgeClass: "bg-muted text-muted-foreground border-border",
                    },
                  };
                  const cfg = statusConfig[entry.status] || statusConfig.PENDING;
                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-2xl border border-border bg-background/80 hover:border-primary/30 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/events/${entry.event_slug}`}
                            className="font-bold text-foreground hover:text-primary transition-colors text-[15px] line-clamp-1"
                          >
                            {entry.event_title}
                          </Link>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {entry.quantity}x {entry.ticket_type_name}
                            {entry.ticket_price > 0
                              ? ` • ₦${((entry.ticket_price * entry.quantity) / 100).toLocaleString()}`
                              : " • Free"}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {entry.status === "ACCEPTED" && entry.checkout_url && (
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/60">
                          <p className="text-xs text-emerald-600 font-medium">
                            Your spot is approved! Complete your purchase before the reservation expires.
                          </p>
                          <Link
                            href={entry.checkout_url}
                            className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                          >
                            Complete Purchase <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-start gap-5 relative z-10">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div className="pt-1">
                  <h3 className="font-extrabold text-foreground text-lg mb-1">No waitlist activity</h3>
                  <p className="text-muted-foreground font-medium mb-5 text-[15px] leading-relaxed">
                    You aren't on any waitlists right now. Waitlists let you get in line for sold-out events.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Explore What's Next */}
      {suggested_events.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Explore What's Next</h2>
            <Link href="/events" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
              See all events
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {suggested_events.map((event: any) => (
              <Link href={`/events/${event.slug || event.id}`} key={event.id} className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="relative h-40 bg-secondary/50 flex items-center justify-center">
                  {event.image ? (
                    <Image src={event.image} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">{event.date}</p>
                  <h4 className="font-bold text-foreground text-base truncate">{event.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
