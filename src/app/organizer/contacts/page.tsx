"use client";

import { useState, useEffect } from "react";
import { Download, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function AttendeesDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"attendees" | "followers">("attendees");
  const [contacts, setContacts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const fetchContacts = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        setLoading(true);
        if (activeTab === "attendees") {
          const url = new URL(`${API_URL}/organizer/contacts/`);
          if (search) url.searchParams.append("search", search);
          
          const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
            const data = await res.json();
            setContacts(data.results || data);
          }
        } else {
          const url = new URL(`${API_URL}/organizer/followers/`);
          if (search) url.searchParams.append("search", search);
          
          const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
            const data = await res.json();
            setFollowers(data.results || data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      const delay = setTimeout(fetchContacts, 300);
      return () => clearTimeout(delay);
    }
  }, [session, search, activeTab]);

  const handleExport = () => {
    // Generate simple CSV
    if (activeTab === "attendees") {
      if (contacts.length === 0) return;
      const header = "Name,Email,Event,Ticket Type,Purchase Date,Status\n";
      const rows = contacts.map(c => 
        `"${c.name}","${c.email}","${c.event_title}","${c.ticket_type}","${new Date(c.purchase_date).toLocaleDateString()}","${c.status}"`
      ).join("\n");
      downloadCsv(header + rows, "attendees");
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
          <p className="text-muted-foreground mt-1 text-sm">Manage your attendees and followers.</p>
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
              placeholder="Search by name, email, or order ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {activeTab === "attendees" && (
            <select
              className="w-full md:w-48 bg-secondary/50 border border-border rounded-lg text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setFilterStatus(e.target.value)}
              value={filterStatus}
            >
              <option value="">All Statuses</option>
              <option value="USED">Checked In</option>
              <option value="ISSUED">Not Checked In</option>
            </select>
          )}
        </div>

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
                  {contacts.filter(c => !filterStatus || (filterStatus === 'USED' ? c.status === 'USED' : c.status !== 'USED')).map((contact) => (
                    <tr key={contact.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{contact.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{contact.email}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{contact.event_title}</td>
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
                          <span className="flex w-fit items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-xs font-bold border border-success/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Checked In
                          </span>
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
