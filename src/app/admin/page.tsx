'use client';

import Link from "next/link";
import { 
  ArrowRight, Users, Calendar, Ticket, Banknote, ScanLine, AlertCircle, BarChart3, Clock, CheckCircle2, XCircle, Loader2 
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;
      try {
        const token = (session as any)?.accessToken;
        if (!token) return;

        const res = await fetch(`${API_URL}/admin/overview/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin overview", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Fallback defaults if null
  const data = stats || {
    total_users: 0,
    active_events: 0,
    events_awaiting_review: 0,
    pending_payouts_count: 0,
    failed_payouts_count: 0,
    total_tickets_sold: 0,
    total_ticket_scans: 0,
    platform_revenue: 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">System Overview</h1>
          <p className="text-muted-foreground">Monitor platform performance, operations, and revenue in real-time.</p>
        </div>
      </div>

      {/* Needs Attention Panel */}
      <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-destructive mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Needs Attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/events?tab=pending" className="bg-background border border-border rounded-xl p-4 flex items-center justify-between hover:border-destructive/50 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg">{data.events_awaiting_review}</p>
                <p className="text-sm text-muted-foreground">Events Awaiting Review</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
          </Link>

          <Link href="/admin/payouts?tab=pending" className="bg-background border border-border rounded-xl p-4 flex items-center justify-between hover:border-amber-500/50 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg">{data.pending_payouts_count}</p>
                <p className="text-sm text-muted-foreground">Pending Payout Requests</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
          </Link>

          <Link href="/admin/payouts?tab=failed" className="bg-background border border-border rounded-xl p-4 flex items-center justify-between hover:border-destructive/50 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg">{data.failed_payouts_count}</p>
                <p className="text-sm text-muted-foreground">Failed Payouts</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Engagement & Growth */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Platform Engagement</h2>
          <div className="grid grid-cols-2 gap-4">
            
            <Link href="/admin/analytics" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-extrabold text-foreground mb-1">---</p>
              <p className="text-sm font-medium text-muted-foreground">Total Event Visits (Coming Soon)</p>
            </Link>
            
            <Link href="/admin/users" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-extrabold text-foreground mb-1">{data.total_users}</p>
              <p className="text-sm font-medium text-muted-foreground">Total Registered Users</p>
            </Link>

            <Link href="/admin/events" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group col-span-2 flex justify-between items-center">
              <div>
                <p className="text-3xl font-extrabold text-foreground mb-1">{data.active_events}</p>
                <p className="text-sm font-medium text-muted-foreground">Published Events</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground mb-1">Live</p>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
              </div>
            </Link>

          </div>
        </section>

        {/* Commerce & Operations */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Commerce & Operations</h2>
          <div className="grid grid-cols-2 gap-4">
            
            <Link href="/admin/tickets" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-extrabold text-foreground mb-1">{data.total_tickets_sold}</p>
              <p className="text-sm font-medium text-muted-foreground">Tickets Sold</p>
            </Link>
            
            <Link href="/admin/transactions" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-extrabold text-foreground mb-1">
                {data.platform_revenue > 0 ? `₦${(data.platform_revenue / 100).toLocaleString()}` : "₦0"}
              </p>
              <p className="text-sm font-medium text-muted-foreground">Platform Revenue (Fees)</p>
            </Link>

            <Link href="/admin/passcontrol" className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-md group col-span-2 flex justify-between items-center">
              <div>
                <p className="text-3xl font-extrabold text-foreground mb-1">{data.total_ticket_scans}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground mb-1">
                  {data.total_tickets_sold > 0 ? Math.round((data.total_ticket_scans / data.total_tickets_sold) * 100) + "%" : "0%"}
                </p>
                <p className="text-sm font-medium text-muted-foreground">Avg. Check-in Rate</p>
              </div>
            </Link>

          </div>
        </section>
      </div>

    </div>
  );
}
