"use client";

import { useMemo, useState } from "react";
import { QRScanner } from "@/components/checkin/QRScanner";
import { ManualSearch } from "@/components/checkin/ManualSearch";
import { LiveFeed } from "@/components/checkin/LiveFeed";
import { CalendarDays, QrCode, ScanLine, Search } from "lucide-react";

export interface AdminScanEvent {
  id: number;
  title: string;
  start_time?: string | null;
  status?: string;
  organizer_name?: string;
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPassControl({ events }: { events: AdminScanEvent[] }) {
  // Empty string means "any event": the ticket's own event is used.
  const [eventId, setEventId] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const filteredEvents = useMemo(() => {
    const term = eventQuery.trim().toLowerCase();
    if (!term) return events;
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(term) ||
        (event.organizer_name || "").toLowerCase().includes(term),
    );
  }, [events, eventQuery]);

  const selectedEvent = events.find((event) => String(event.id) === eventId);
  const onCheckInSuccess = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <ScanLine className="w-8 h-8 text-primary" />
          PassControl Scanner
        </h1>
        <p className="text-muted-foreground">
          Scan or manually check in a ticket for any event on the platform. Every scan is recorded
          against your admin account.
        </p>
      </header>

      {/* Event picker */}
      <section className="bg-background border border-border rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarDays className="w-4 h-4 text-primary" />
          Which event are you scanning for?
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={eventQuery}
              onChange={(event) => setEventQuery(event.target.value)}
              placeholder="Filter events by name or organizer..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Any event — detect from the ticket</option>
            {filteredEvents.map((event) => (
              <option key={event.id} value={String(event.id)}>
                {event.title} — {event.organizer_name || "Organizer"} ({formatDate(event.start_time)})
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          {selectedEvent ? (
            <>
              Scanning for <span className="font-semibold text-foreground">{selectedEvent.title}</span>
              {selectedEvent.organizer_name ? ` by ${selectedEvent.organizer_name}` : ""}.
            </>
          ) : (
            <>
              Any event is accepted. The scanner reads the event from each ticket, so you can work a
              gate without choosing one first.
            </>
          )}
        </p>
      </section>

      <div className={`grid gap-6 ${selectedEvent ? "lg:grid-cols-3" : ""}`}>
        {/* Check-in area */}
        <div className="lg:col-span-2 bg-background border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === "qr"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <QrCode className="w-5 h-5" />
              QR Scanner
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === "manual"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Search className="w-5 h-5" />
              Manual Search
            </button>
          </div>

          <div className="p-6">
            {activeTab === "qr" ? (
              <QRScanner
                key={eventId || "any"}
                eventId={eventId || undefined}
                onSuccess={onCheckInSuccess}
              />
            ) : (
              <ManualSearch
                key={`manual-${eventId || "any"}`}
                eventId={eventId || undefined}
                onSuccess={onCheckInSuccess}
              />
            )}
          </div>
        </div>

        {/* Live feed only makes sense for a single event */}
        {selectedEvent && (
          <div className="lg:col-span-1">
            <LiveFeed eventId={String(selectedEvent.id)} refreshTrigger={refreshTrigger} />
          </div>
        )}
      </div>
    </div>
  );
}
