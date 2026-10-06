"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Clock, ArrowLeft, Ticket } from "lucide-react";

export default function PublicTicketView() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/public/${params.qr_token}/`);
        if (!res.ok) throw new Error("Ticket not found or invalid.");
        const data = await res.json();
        setTicket(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (params.qr_token) fetchTicket();
  }, [params.qr_token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30">
        <h1 className="text-2xl font-bold text-foreground mb-4">Ticket Not Found</h1>
        <p className="text-muted-foreground mb-8">This ticket link is invalid or has expired.</p>
        <Link href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
          Go Home
        </Link>
      </div>
    );
  }

  const startDate = new Date(ticket.event.start_time);


  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="CirclePass Logo" width={120} height={40} className="mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your Ticket</h1>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="relative h-48 sm:h-64 w-full bg-muted">
            {ticket.event.cover_image ? (
              <img src={ticket.event.cover_image} alt={ticket.event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Ticket className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <span className="inline-block px-3 py-1 bg-primary/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-2">
                {ticket.ticket_type.name}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2">
                {ticket.event.title}
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start justify-between border-b border-border pb-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                    <p>{format(startDate, "h:mm a")}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{ticket.event.is_online ? "Online Event" : ticket.event.venue?.name}</p>
                    {!ticket.event.is_online && <p>{ticket.event.venue?.location}</p>}
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">Attendee</p>
                  <p className="font-semibold text-foreground text-lg">{ticket.attendee_name || "Guest"}</p>
                </div>
              </div>

              <div className="flex flex-col items-center p-6 bg-secondary/30 rounded-2xl w-full sm:w-auto">
                  <>
                    <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                      <QRCodeSVG value={ticket.qr_token} size={160} />
                    </div>
                    <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded-full text-sm">
                      ACTIVE
                    </span>
                  </>
              </div>
            </div>

            <div className="pt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Want to manage your tickets easily in one place?
              </p>
              <Link href="/register" className="inline-block bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-lg hover:bg-primary/90 transition">
                Create a Free Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
