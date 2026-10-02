"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { API_URL } from "@/lib/api/config";

export default function AdminSupportPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/support-tickets/`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      if (!res.ok) throw new Error("Failed to load support tickets");
      const data = await res.json();
      setTickets(data.results || data);
    } catch (error) {
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchTickets();
    }
  }, [session]);

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/support-tickets/${ticketId}/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
      fetchTickets();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground mt-2">Manage organizer complaints and support requests.</p>
        </div>
      </header>

      {tickets.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No support tickets</h3>
          <p className="text-muted-foreground mt-2">All complaints have been resolved.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{ticket.issue_type}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    From: <span className="font-medium text-foreground">{ticket.user_name || ticket.user_email}</span> ({ticket.user_email})
                  </p>
                  {ticket.related_event && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Event ID: <span className="font-medium text-foreground">{ticket.related_event}</span>
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <select 
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    value={ticket.status}
                    onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 mt-4 text-sm text-foreground whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
