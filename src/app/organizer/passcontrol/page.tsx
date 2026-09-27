'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { QRScanner } from '@/components/checkin/QRScanner';
import { ManualSearch } from '@/components/checkin/ManualSearch';
import { LiveFeed } from '@/components/checkin/LiveFeed';
import { QrCode, Search, Calendar } from 'lucide-react';
import { API_URL } from "@/lib/api/config";

export default function PassControlPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch organizer's events
  useEffect(() => {
    const fetchEvents = async () => {
      if (status === "loading") return;
      try {
        const token = (session as any)?.accessToken;
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/events/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Filter to only events that are not in DRAFT or ARCHIVED state, or just show all for now
          setEvents(data);
          if (data.length > 0) {
            setSelectedEventId(data[0].id.toString());
          }
        }
      } catch (e) {
        console.error('Failed to fetch events', e);
      } finally {
        setLoading(false);
      }
    };
    
    if (status !== "loading") {
      fetchEvents();
    }
  }, [session, status]);

  const onCheckInSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto h-[80vh] flex items-center justify-center">Loading...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto h-[80vh] flex flex-col">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground capitalize">PassControl</h1>
        </header>
        <div className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-12 text-center bg-secondary/50">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Events Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You don't have any active events to check in attendees for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-heading">PassControl</h1>
          <p className="text-muted-foreground mt-1">Scan tickets or manually check in attendees.</p>
        </div>
        
        <div className="w-full md:w-auto">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full md:w-64 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1] block p-2.5"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Check-in Area */}
        <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'qr'
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <QrCode size={20} />
              QR Scanner
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Search size={20} />
              Manual Search
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'qr' ? (
              <QRScanner eventId={selectedEventId} onSuccess={onCheckInSuccess} />
            ) : (
              <ManualSearch eventId={selectedEventId} onSuccess={onCheckInSuccess} />
            )}
          </div>
        </div>

        {/* Sidebar: Live Feed & Stats */}
        <div className="w-full lg:w-1/3">
          <LiveFeed eventId={selectedEventId} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
