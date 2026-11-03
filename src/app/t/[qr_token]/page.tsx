"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Ticket, Share2, Check, Lock } from "lucide-react";
import { useSession } from "@/context/AuthContext";
import { API_URL } from "@/lib/api/config";

type AccessState = "checking" | "granted" | "signed-out" | "denied" | "missing";

export default function PublicTicketView() {
  const params = useParams();
  const { data: session, status } = useSession();
  const [ticket, setTicket] = useState<any>(null);
  const [state, setState] = useState<AccessState>("checking");
  const [message, setMessage] = useState("");
  const [shareLabel, setShareLabel] = useState("Share");

  const qrToken = Array.isArray(params?.qr_token) ? params.qr_token[0] : params?.qr_token;
  const accessToken = session?.accessToken;

  useEffect(() => {
    if (status === "loading") return;
    if (!qrToken) {
      setState("missing");
      return;
    }

    if (!accessToken) {
      setState("signed-out");
      return;
    }

    let cancelled = false;
    const fetchTicket = async () => {
      try {
        const res = await fetch(`${API_URL}/tickets/public/${qrToken}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) setState("signed-out");
          return;
        }
        if (res.status === 403) {
          if (!cancelled) {
            setMessage("This pass belongs to someone else. Sign in with the email address used to buy it.");
            setState("denied");
          }
          return;
        }
        if (res.status === 404) {
          if (!cancelled) setState("missing");
          return;
        }
        if (!res.ok) throw new Error("Ticket not found or invalid.");

        const data = await res.json();
        if (!cancelled) {
          setTicket(data);
          setState("granted");
        }
      } catch (err: any) {
        if (!cancelled) {
          setMessage(err.message || "");
          setState("missing");
        }
      }
    };

    fetchTicket();
    return () => {
      cancelled = true;
    };
  }, [qrToken, accessToken, status]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: ticket?.event_title || "CirclePass ticket", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy this ticket link", url);
      }
      setShareLabel("Link copied");
      setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (state === "signed-out") {
    const redirectParam = encodeURIComponent(`/t/${qrToken}`);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 px-4 text-center">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-md">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Sign in to view this ticket</h1>
          <p className="text-muted-foreground mb-8">
            For your security, passes are only visible to the attendee who bought them, the event
            organizer and CirclePass admins.
          </p>
          <Link
            href={`/login?redirect=${redirectParam}`}
            className="inline-block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Sign in to continue
          </Link>
          <Link href="/find-ticket" className="inline-block mt-4 text-sm text-muted-foreground hover:text-foreground transition">
            Find my ticket with my email
          </Link>
        </div>
      </div>
    );
  }

  if (state === "denied" || state === "missing" || !ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 px-4 text-center">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {state === "denied" ? "You don't have access to this ticket" : "Ticket Not Found"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {state === "denied"
              ? message
              : "This ticket link is invalid or has expired."}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?redirect=${encodeURIComponent(`/t/${qrToken}`)}`}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
            >
              Sign in with another account
            </Link>
            <Link href="/" className="px-6 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-secondary transition">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const startDate = ticket.event_start_time ? new Date(ticket.event_start_time) : null;
  const hasValidStart = startDate !== null && !Number.isNaN(startDate.getTime());

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    ISSUED: "bg-green-100 text-green-700",
    USED: "bg-orange-100 text-orange-700",
    EXPIRED: "bg-gray-200 text-gray-700",
    INVALIDATED: "bg-red-100 text-red-700",
  };
  const statusClass = statusStyles[ticket.status] || "bg-gray-200 text-gray-700";

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
            {ticket.event_image ? (
              <img src={ticket.event_image} alt={ticket.event_title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Ticket className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <span className="inline-block px-3 py-1 bg-primary/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-2">
                {ticket.ticket_type_name}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2">
                {ticket.event_title}
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start justify-between border-b border-border pb-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {hasValidStart ? format(startDate as Date, "EEEE, MMMM d, yyyy") : "Date to be announced"}
                    </p>
                    {hasValidStart && <p>{format(startDate as Date, "h:mm a")}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{ticket.event_is_online ? "Online Event" : ticket.event_venue}</p>

                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">Attendee</p>
                  <p className="font-semibold text-foreground text-lg">{ticket.attendee_name || "Guest"}</p>
                </div>
              </div>

              <div className="flex flex-col items-center p-6 bg-secondary/30 rounded-2xl w-full sm:w-auto">
                <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                  <QRCodeSVG value={ticket.qr_token} size={160} />
                </div>
                <span className={`px-4 py-1.5 font-bold rounded-full text-sm ${statusClass}`}>
                  {ticket.status}
                </span>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-secondary transition"
              >
                {shareLabel === "Share" ? <Share2 className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
                {shareLabel}
              </button>
              <Link
                href="/dashboard/tickets"
                className="inline-block bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-lg hover:bg-primary/90 transition"
              >
                Manage my tickets
              </Link>
            </div>

            <p className="pt-6 text-center text-xs text-muted-foreground">
              Anyone you share this link with must sign in as you, the organizer, or an admin to open it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
