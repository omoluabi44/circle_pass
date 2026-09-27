'use client';

import { useState, useEffect } from 'react';
import { Search, UserCheck, AlertCircle } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";

interface Ticket {
  id: number;
  attendee_name: string;
  attendee_email: string;
  status: string;
  ticket_type: string;
  qr_token_snippet: string;
}

interface ManualSearchProps {
  eventId: string;
  onSuccess: () => void;
}

export function ManualSearch({ eventId, onSuccess }: ManualSearchProps) {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTickets();
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const searchTickets = async () => {
    try {
      setLoading(true);
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/check-in/search/?event_id=${eventId}&q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (ticketId: number) => {
    try {
      setActionLoading(ticketId);
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/check-in/scan/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_id: ticketId })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Update local state to reflect change
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'USED' } : t));
        onSuccess();
        alert('Check-in successful!');
      } else {
        alert(data.detail || 'Check-in failed.');
      }
    } catch (e) {
      alert('Network error during check-in.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1] sm:text-sm"
          placeholder="Search by name, email, or ticket code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="text-center py-4 text-gray-500">Searching...</div>}

      {!loading && tickets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No tickets found matching your search.
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ticket.attendee_name || 'Guest'}</div>
                    <div className="text-sm text-gray-500">{ticket.attendee_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ticket.ticket_type}</div>
                    <div className="text-xs text-gray-500 font-mono">{ticket.qr_token_snippet}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.status === 'USED' ? 'bg-gray-100 text-gray-800' :
                      ticket.status === 'ACTIVE' || ticket.status === 'ISSUED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {ticket.status === 'USED' ? (
                      <span className="text-gray-400 flex justify-end items-center gap-1">
                        <AlertCircle size={16} /> Checked In
                      </span>
                    ) : (ticket.status === 'ACTIVE' || ticket.status === 'ISSUED') ? (
                      <button
                        onClick={() => handleCheckIn(ticket.id)}
                        disabled={actionLoading === ticket.id}
                        className="text-white bg-[#6366f1] hover:bg-[#5046e5] px-4 py-2 rounded-md transition-colors flex items-center gap-2 ml-auto disabled:opacity-50"
                      >
                        <UserCheck size={16} />
                        {actionLoading === ticket.id ? 'Checking...' : 'Check In'}
                      </button>
                    ) : (
                      <span className="text-red-500">Invalid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
