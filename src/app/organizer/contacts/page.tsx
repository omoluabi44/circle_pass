"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, Search, CheckCircle2, XCircle, Loader2, CalendarDays } from "lucide-react";
import { useSession } from "@/context/AuthContext";
import { API_URL } from "@/lib/api/config";

type Contact = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  event_id: number;
  event_title: string;
  event_slug?: string;
  order_id?: number;
  order_reference?: string;
  ticket_type: string;
  purchase_date: string;
  status: string;
  checked_in_at?: string | null;
};

type EventOption = {
  id: number;
  title: string;
  slug?: string;
  status?: string;
  start_time?: string;
  tickets_sold: number;
  checked_in: number;
};

export default function AttendeesDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"attendees" | "followers">("attendees");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const accessToken = (session as any)?.accessToken as string | undefined;

  // Every event this organizer has hosted, for the event picker.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/organizer/contacts/events/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEvents(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Failed to fetch events", err);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!accessToken) return;

      try {
        setLoading(true);
        setError(null);
        if (activeTab === "attendees") {
          const url = new URL(`${API_URL}/organizer/contacts/`);
          if (search) url.searchParams.append("search", search);
          if (eventFilter) url.searchParams.append("event_id", eventFilter);
          if (filterStatus) url.searchParams.append("status", filterStatus);

          const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: "no-store",
          });

          if (!res.ok) throw new Error("Failed to load attendees");
          const data = await res.json();
          setContacts(data.results || data);
        } else {
          const url = new URL(`${API_URL}/organizer/followers/`);
          if (search) url.searchParams.append("search", search);

          const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: "no-store",
          });

          if (!res.ok) throw new Error("Failed to load followers");
          const data = await res.json();
          setFollowers(data.results || data);
        }
      } catch (err: any) {
        console.error("Failed to fetch data", err);
        setError(err.message || "Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      const delay = setTimeout(fetchContacts, 300);
      return () => clearTimeout(delay);
    }
  }, [accessToken, search, activeTab, eventFilter, filterStatus]);

  const selectedEvent = events.find((event) => String(event.id) === eventFilter);

  const handleExport = () => {
    // Generate simple CSV
    if (activeTab === "attendees") {
      if (contacts.length === 0) return;
      const header = "Name,Email,Phone,Event,Ticket Type,Purchase Date,Check-in Date,Status,Order ID\n";
      const rows = contacts.map(c =>
        [
          c.name,
          c.email,
          c.phone || "",
          c.event_title,
          c.ticket_type,
          new Date(c.purchase_date).toLocaleDateString(),
          c.checked_in_at ? new Date(c.checked_in_at).toLocaleDateString() : "",
          c.status === "USED" ? "Checked In" : "Not Checked In",
          c.order_reference || c.order_id || "",
        ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
      ).join("\n");
      downloadCsv(header + rows, selectedEvent?.slug || "attendees");
    } else {
      if (followers.length === 0) return;
      const header = "Name,Email,Followed Date\n";
      const rows = followers.map(c =>
        `"${c.name}","${c.email}","${new Date(c.followed_at).toLocaleDateString()}"`
      ).join("\n");
      downloadCsv(header + rows, "followers");
    }
  };

  const downloadCsv = (csvContent: string, prefix: string) => {
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circlepass_${prefix}_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audience</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every ticket sold across all your events, in one place.
          </p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-5 py-2.5 rounded-lg font-medium transition-colors">
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </header>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("attendees")}
          className={`px-6 py-2.5 rounded-full font-bold transition-all ${
            activeTab === "attendees"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          Attendees
        </button>
        <button
          onClick={() => setActiveTab("followers")}
          className={`px-6 py-2.5 rounded-full font-bold transition-all ${
            activeTab === "followers"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          Followers
        </button>
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm flex flex-col flex-1 mb-8 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, phone, order ID or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {activeTab === "attendees" && (
            <>
              <select
                className="w-full md:w-64 bg-secondary/50 border border-border rounded-lg text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setEventFilter(e.target.value)}
                value={eventFilter}
              >
                <option value="">All Events ({events.length})</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({event.tickets_sold})
                  </option>
                ))}
              </select>
              <select
                className="w-full md:w-48 bg-secondary/50 border border-border rounded-lg text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setFilterStatus(e.target.value)}
                value={filterStatus}
              >
                <option value="">All Statuses</option>
                <option value="USED">Checked In</option>
                <option value="NOT_USED">Not Checked In</option>
              </select>
            </>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === "attendees" ? (
          contacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No attendees found</p>
              <p>We couldn't find any attendees matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Name / Email</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Event</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Ticket Type</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Purchase Date</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Check-in Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{contact.name || contact.email || "Guest"}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{contact.email}</p>
                        {contact.phone && (
                          <p className="text-muted-foreground text-xs mt-0.5">{contact.phone}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <Link
                          href={`/organizer/events/${contact.event_id}/attendees`}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {contact.event_title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold border border-primary/20 whitespace-nowrap">
                          {contact.ticket_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(contact.purchase_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {contact.status === 'USED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex w-fit items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-xs font-bold border border-success/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Checked In
                            </span>
                            {contact.checked_in_at && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(contact.checked_in_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="flex w-fit items-center gap-1.5 bg-secondary text-muted-foreground px-2.5 py-1 rounded-full text-xs font-bold border border-border">
                            <XCircle className="w-3 h-3" />
                            Not Checked In
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          followers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No followers found</p>
              <p>You don't have any followers matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Name / Email</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Followed Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {followers.map((follower) => (
                    <tr key={follower.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{follower.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{follower.email}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(follower.followed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
