'use client';

import Link from "next/link";
import { Plus, ArrowUpRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function OrganizerDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchDashboard = async () => {
      try {
        const token = (session as any)?.accessToken;
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/organizer/dashboard/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          console.error("Dashboard API error:", res.status, await res.text());
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [session]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Fallback defaults if null
  const balance = data?.available_balance || 0;
  const ticketsSold = data?.tickets_sold || 0;
  const checkinRate = data?.checkin_rate || 0;
  const activeEvents = data?.active_events || [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <Link href="/organizer/events/create" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-medium transition-colors w-full md:w-auto">
          <Plus className="w-5 h-5" />
          Create Event
        </Link>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Available Balance</p>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            ₦{(balance / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mt-3">
            <span>Real-time wallet balance</span>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Tickets Sold (All Time)</p>
          <h2 className="text-3xl font-bold text-foreground mb-2">{ticketsSold.toLocaleString()}</h2>
          <div className="flex items-center gap-1 text-xs text-success font-medium mt-3">
            <ArrowUpRight className="w-3 h-3" />
            <span>Growing steadily</span>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Avg Check-in Rate</p>
          <h2 className="text-3xl font-bold text-foreground mb-2">{checkinRate}%</h2>
          <p className="text-xs text-muted-foreground font-medium mt-3">Across all events</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-2">Total Followers</p>
            <h2 className="text-3xl font-bold text-foreground mb-2">{data?.followers_count || 0}</h2>
          </div>
          <Link href="/organizer/contacts" className="text-xs text-primary font-bold hover:underline mt-3">
            View followers list →
          </Link>
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-foreground mb-4">Recent Events</h2>
      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
                {activeEvents.length > 0 ? (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {activeEvents.map((evt: any) => (
                <div key={evt.id} className="p-4 space-y-3 bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-foreground leading-tight">{evt.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      evt.status === 'PUBLISHED' || evt.status === 'LIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>
                      {evt.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground border-t border-border/50 pt-2">
                    <span>Sales: <span className="font-medium text-foreground">{evt.tickets_sold}</span> {evt.capacity ? `/ ${evt.capacity}` : ''}</span>
                    <span>Revenue: <span className="font-medium text-foreground">₦{(evt.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></span>
                  </div>
                  <div className="pt-1">
                    <Link href={`/organizer/events/${evt.id}`} className="block w-full py-2.5 text-center bg-primary/10 text-primary rounded-lg font-semibold text-sm hover:bg-primary/20 transition-colors">
                      Manage Event
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Event Name</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Sales</th>
                    <th className="px-6 py-4 font-semibold">Revenue</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {activeEvents.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{evt.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          evt.status === 'PUBLISHED' || evt.status === 'LIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        {evt.tickets_sold} {evt.capacity ? `/ ${evt.capacity}` : ''}
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        ₦{(evt.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/organizer/events/${evt.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>You haven't created any events yet.</p>
          </div>
        )}
      </div>

      {/* Referrals Table */}
      <h2 className="text-xl font-bold text-foreground mt-12 mb-6">Top Referrals</h2>
      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden mb-12">
                {data?.referrals && data.referrals.length > 0 ? (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.referrals.map((ref: any, idx: number) => (
                <div key={idx} className="p-4 space-y-2 bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-base tracking-wide">{ref.referral_code}</span>
                    <span className="font-semibold text-success">₦{(ref.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Sales: <span className="font-medium text-foreground">{ref.sales}</span> ticket(s)
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Referral Code</th>
                    <th className="px-6 py-4 font-semibold">Total Sales</th>
                    <th className="px-6 py-4 font-semibold">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {data.referrals.map((ref: any, idx: number) => (
                    <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{ref.referral_code}</td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        {ref.sales} ticket(s)
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        ₦{(ref.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No referral data available yet.</p>
          </div>
        )}
      </div>

    </div>
  );
}
