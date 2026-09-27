"use client";
import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, Ticket, Activity, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function OrganizerAnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/organizer/analytics/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchAnalytics();
    }
  }, [session]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const metrics = data?.metrics || { total_tickets: 0, total_revenue: 0, checkin_rate: 0, total_attendees: 0 };
  const trends = data?.trends || [];
  const topEvents = data?.top_events || [];

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...trends.map((t: any) => t.revenue), 1);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Analytics Overview</h1>
        <p className="text-muted-foreground mt-2">Track performance across all your events.</p>
      </header>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Ticket Volume", value: metrics.total_tickets.toLocaleString(), icon: Ticket, trend: "" },
          { label: "Total Revenue", value: `₦${(metrics.total_revenue / 100).toLocaleString('en-NG', {minimumFractionDigits: 2})}`, icon: TrendingUp, trend: "" },
          { label: "Avg Check-in Rate", value: `${metrics.checkin_rate}%`, icon: Activity, trend: "" },
          { label: "Total Attendees", value: metrics.total_attendees.toLocaleString(), icon: Users, trend: "" },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                {metric.trend && <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-md">{metric.trend}</span>}
              </div>
              <h3 className="text-sm font-bold text-muted-foreground mb-1">{metric.label}</h3>
              <p className="text-2xl font-extrabold text-foreground">{metric.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Revenue Trends (Last 7 Days)
          </h3>
          <div className="h-64 flex items-end gap-2 justify-between mt-8">
            {trends.map((val: any, i: number) => {
              const heightPct = Math.max((val.revenue / maxRevenue) * 100, 2);
              return (
                <div key={i} className="w-full relative group flex flex-col justify-end h-full">
                  <div 
                    className="bg-primary/20 hover:bg-primary transition-colors rounded-t-md w-full relative" 
                    style={{ height: `${heightPct}%` }} 
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                      ₦{(val.revenue / 100).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs font-bold text-muted-foreground border-t border-border pt-4">
            {trends.map((val: any, i: number) => (
              <span key={i} className="w-full text-center">{val.day}</span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-6">Top Performing Events</h3>
          <div className="space-y-4">
            {topEvents.length > 0 ? topEvents.map((event: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-transparent hover:border-border transition-colors">
                <span className="font-bold text-sm text-foreground truncate max-w-[180px]">{event.name}</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full whitespace-nowrap ml-2">{event.sales} tickets</span>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground text-center p-4">No ticket sales yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
