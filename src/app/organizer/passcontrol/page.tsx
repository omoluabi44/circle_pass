'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { QRScanner } from '@/components/checkin/QRScanner';
import { ManualSearch } from '@/components/checkin/ManualSearch';
import { LiveFeed } from '@/components/checkin/LiveFeed';
import { TeamManagement } from '@/components/checkin/TeamManagement';
import { QrCode, Search, Calendar, Users } from 'lucide-react';
import { API_URL } from "@/lib/api/config";

export default function PassControlPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'manual' | 'team'>('qr');
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
          <h1 className="text-3xl font-bold text-gray-900 font-heading">PassControl</h1>
        </header>
        <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
          <Calendar className="w-12 h-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Events Found</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            You don't have any active events to check in attendees for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-heading tracking-tight">PassControl</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage check-ins and your event team.</p>
        </div>
        
        <div className="w-full md:w-auto relative">
          <select 
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full md:w-64 bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-[#6366f1] focus:border-[#6366f1] block p-3 pr-10 appearance-none font-medium shadow-sm"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Check-in Area */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-wrap">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-4 px-2 min-w-[120px] flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                  activeTab === 'qr'
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/[0.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <QrCode size={18} strokeWidth={activeTab === 'qr' ? 2.5 : 2} />
                QR Scanner
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-4 px-2 min-w-[120px] flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                  activeTab === 'manual'
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/[0.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Search size={18} strokeWidth={activeTab === 'manual' ? 2.5 : 2} />
                Manual Search
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 py-4 px-2 min-w-[120px] flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                  activeTab === 'team'
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/[0.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users size={18} strokeWidth={activeTab === 'team' ? 2.5 : 2} />
                Team Members
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6">
              {activeTab === 'qr' && <QRScanner eventId={selectedEventId} onSuccess={onCheckInSuccess} />}
              {activeTab === 'manual' && <ManualSearch eventId={selectedEventId} onSuccess={onCheckInSuccess} />}
              {activeTab === 'team' && <TeamManagement eventId={selectedEventId} />}
            </div>
          </div>
        </div>

        {/* Live Feed & Stats */}
        <div className="w-full lg:w-1/3">
          <LiveFeed eventId={selectedEventId} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
