"use client";

import { useState, useEffect } from "react";
import { Ticket, MapPin, Calendar, Clock, ArrowRight, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function MyTicketsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/tickets/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const results = data.results || data;
          
          // Map to match frontend format and determine past vs upcoming
          const now = new Date();
          const mapped = results.map((t: any) => {
            const startDate = new Date(t.event_start_time);
            return {
              id: t.id,
              title: t.event_title,
              date: startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              venue: t.event_venue || "Online",
              type: t.ticket_type_name || t.ticket_type_tier,
              status: t.status,
              image: t.event_image,
              isPast: startDate < now,
              qr_token: t.qr_token
            };
          });
          setTickets(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchTickets();
  }, [session]);

  const displayedTickets = tickets.filter(t => activeTab === "upcoming" ? !t.isPast : t.isPast);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight pt-4 md:pt-0">My Tickets</h1>
        <p className="text-muted-foreground mt-2 font-medium">Access your purchased passes.</p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "upcoming" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming Events
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "past" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Past Events
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayedTickets.length === 0 ? (
        <div className="bg-background border border-border rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
            <Ticket className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No {activeTab === "upcoming" ? "upcoming" : "past"} tickets
          </h2>
          <p className="text-muted-foreground mb-8">
            You don't have any tickets for {activeTab === "upcoming" ? "upcoming" : "past"} events right now.
          </p>
          <Link href="/events" className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors">
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedTickets.map((ticket) => (
            <div key={ticket.id} className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-border/80 transition-colors">
              <div className="h-32 w-full relative bg-secondary/50 flex items-center justify-center">
                {ticket.image ? (
                  <Image src={ticket.image} alt={ticket.title} fill className="object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                )}
                <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/50 text-xs font-bold text-foreground">
                  {ticket.date}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-foreground text-lg line-clamp-1 flex-1 pr-4">{ticket.title}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                    ticket.status === 'ACTIVE' || ticket.status === 'ISSUED' 
                    ? 'bg-success/10 text-success' 
                    : ticket.status === 'USED' 
                    ? 'bg-secondary text-muted-foreground' 
                    : 'bg-primary/10 text-primary'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{ticket.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-1">{ticket.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                    <div className="w-4 h-4 rounded bg-secondary flex items-center justify-center shrink-0">
                      <Ticket className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-bold text-foreground">{ticket.type}</span>
                  </div>
                </div>

                <Link href={`/dashboard/tickets/${ticket.qr_token || ticket.id}`} className="w-full flex items-center justify-between bg-secondary hover:bg-secondary/80 text-foreground px-4 py-3 rounded-xl font-bold transition-colors">
                  View Digital Pass
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
