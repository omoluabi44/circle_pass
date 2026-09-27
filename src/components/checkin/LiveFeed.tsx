'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, CheckCircle, Clock } from 'lucide-react';

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
}

interface StatsData {
  total_tickets: number;
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
    return <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">Loading stats...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-bold font-heading text-gray-900 flex items-center gap-2">
          <Activity className="text-[#6366f1]" size={20} />
          Live Statistics
        </h3>
      </div>

      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-gray-600">Attendance</span>
            <span className="text-gray-900">{stats.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-[#6366f1] h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <CheckCircle size={16} />
              <span className="text-sm font-semibold">Checked In</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.checked_in}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Users size={16} />
              <span className="text-sm font-semibold">Remaining</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.remaining}</p>
          </div>
        </div>

        {/* Recent Scans Feed */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Recent Scans</h4>
          
          {stats.recent_scans.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No scans yet.</p>
          ) : (
            <div className="space-y-4">
              {stats.recent_scans.map((scan) => (
                <div key={scan.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    scan.status === 'Valid' ? 'bg-green-500' :
                    scan.status === 'Already Used' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {scan.attendee_name || 'Guest'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{scan.ticket_type}</span>
                      <span className="text-gray-300">•</span>
                      <span className={`text-xs font-medium ${
                        scan.status === 'Valid' ? 'text-green-600' :
                        scan.status === 'Already Used' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-400 gap-1 flex-shrink-0">
                    <Clock size={12} />
                    {timeAgo(scan.scanned_at)}
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
