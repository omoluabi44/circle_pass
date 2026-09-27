"use client";

import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { getEventAttendees } from '@/lib/api/events';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export default function AttendeesPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchAttendees() {
      if (status === "loading") return;
      if (!session?.accessToken || !id || id === "undefined") return;
      try {
        const data = await getEventAttendees(session.accessToken as string, id);
        // data could be paginated ({ results: [...] }) or a flat array
        const results = data.results || data;
        setAttendees(results);
      } catch (err) {
        toast.error("Failed to fetch attendees");
      } finally {
        setLoading(false);
      }
    }
    fetchAttendees();
  }, [id, session, status]);

  const filteredAttendees = attendees.filter((a) => 
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-foreground">Attendees</h1>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendees..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          <button className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="p-4 text-sm font-semibold text-muted-foreground">Name</th>
                <th className="p-4 text-sm font-semibold text-muted-foreground">Email</th>
                <th className="p-4 text-sm font-semibold text-muted-foreground">Ticket Type</th>
                <th className="p-4 text-sm font-semibold text-muted-foreground">Purchase Date</th>
                <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading attendees...</td>
                </tr>
              ) : filteredAttendees.length > 0 ? (
                filteredAttendees.map((attendee) => (
                  <tr key={attendee.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{attendee.name || '-'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{attendee.email || '-'}</td>
                    <td className="p-4 text-sm text-foreground">{attendee.ticket_type || 'Unknown'}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {attendee.purchase_date ? new Date(attendee.purchase_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        attendee.status === 'USED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {attendee.status === 'USED' ? 'Checked In' : attendee.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No attendees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
