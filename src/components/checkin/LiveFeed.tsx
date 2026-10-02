'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, CheckCircle, Clock, Ticket, AlertCircle } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { API_URL } from "@/lib/api/config";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface CheckInRecord {
  id: number;
  attendee_name: string;
  ticket_type: string;
  status: string;
  scanned_at: string;
  scanned_by_name?: string;
}

interface StatsData {
  total_tickets: number;
  active_passes: number;
  checked_in: number;
  remaining: number;
  percentage: number;
  recent_scans: CheckInRecord[];
}

interface LiveFeedProps {
  eventId: string;
  refreshTrigger: number;
}

export function LiveFeed({ eventId, refreshTrigger }: LiveFeedProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);

  const fetchStats = async () => {
    if (!eventId) return;
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(`${API_URL}/check-in/stats/?event_id=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll every 5 seconds or when refreshTrigger changes
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [eventId, refreshTrigger]);

  if (!stats) {
    return <div className="p-6 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 animate-pulse">Loading stats...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-bold font-heading text-gray-900 flex items-center gap-2">
          <Activity className="text-[#6366f1]" size={20} />
          Pass Statistics
        </h3>
      </div>

      <div className="p-6">
        {/* Check-in Rate Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-gray-600">Check-in Rate</span>
            <span className="text-gray-900 font-bold">{stats.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-[#6366f1] h-2 rounded-full transition-all duration-500" 
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100/50">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <Ticket size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Passes</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.total_tickets}</p>
          </div>
          
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
            <div className="flex items-center gap-1.5 text-amber-600 mb-1">
              <AlertCircle size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Active/Unused</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.active_passes}</p>
          </div>
          
          <div className="bg-green-50/50 p-4 rounded-xl border border-green-100/50">
            <div className="flex items-center gap-1.5 text-green-600 mb-1">
              <CheckCircle size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Checked-In</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.checked_in}</p>
          </div>
          
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Users size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Remaining</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.remaining}</p>
          </div>
        </div>

        {/* Recent Scans Feed */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Scan Audit Trail</h4>
          
          {stats.recent_scans.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded-lg">No scans performed yet.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {stats.recent_scans.map((scan) => (
                <div key={scan.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    scan.status === 'Valid' ? 'bg-green-500' :
                    scan.status === 'Already Used' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {scan.attendee_name || 'Guest'}
                      </p>
                      <div className="flex items-center text-xs text-gray-400 gap-1 flex-shrink-0 whitespace-nowrap ml-2">
                        <Clock size={12} />
                        {timeAgo(scan.scanned_at)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                        scan.status === 'Valid' ? 'bg-green-50 text-green-700' :
                        scan.status === 'Already Used' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {scan.status}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{scan.ticket_type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Scanned by <span className="font-medium text-gray-600">{scan.scanned_by_name || 'System'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
