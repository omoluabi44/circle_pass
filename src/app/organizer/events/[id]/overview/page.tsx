"use client";

import { useState, useEffect, use } from "react";
import { Activity, PauseCircle, PlayCircle, ListPlus, Users, ArrowLeft, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { getEventOverview, updateEvent } from "@/lib/api/events";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export default function RealTimeEventDashboard() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchOverview() {
      if (status === "loading") return;
      if (!session?.accessToken || !id || id === "undefined") return;
      try {
        const data = await getEventOverview(session.accessToken as string, id);
        setOverview(data);
      } catch (err) {
        toast.error("Failed to fetch event overview");
        setOverview({}); // prevents infinite spinner
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, [id, session, status]);

  if (loading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading overview...</div>;
  }

  if (!overview) {
    return <div className="p-8 flex justify-center text-destructive">Event not found.</div>;
  }

  const capacity = overview.total_capacity || 1; // avoid division by zero
  const checkInPercent = Math.min(100, Math.round((overview.check_ins / capacity) * 100));
  const remaining = Math.max(0, capacity - overview.check_ins);
  
  const ticketsSold = overview.tickets_sold || 0;
  
  const toggleSales = async () => {
    setUpdating(true);
    try {
      const updated = await updateEvent(session?.accessToken as string, id, {
        sales_paused: !overview.sales_paused
      });
      setOverview({ ...overview, sales_paused: updated.sales_paused });
      toast.success(updated.sales_paused ? "Sales paused." : "Sales resumed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update sales status.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleWaitlist = async () => {
    setUpdating(true);
    try {
      const updated = await updateEvent(session?.accessToken as string, id, {
        waitlist_enabled: !overview.waitlist_enabled
      });
      setOverview({ ...overview, waitlist_enabled: updated.waitlist_enabled });
      toast.success(updated.waitlist_enabled ? "Waitlist enabled (activates when tickets sell out)." : "Waitlist disabled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update waitlist.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <Link href="/organizer/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{overview.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${overview.status === 'LIVE' ? 'bg-success/10 text-success border-success/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                {overview.status === 'LIVE' && <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>}
                {overview.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-muted-foreground">• {new Date(overview.start_time).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSales}
              disabled={updating}
              className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                overview.sales_paused 
                  ? 'bg-success/10 hover:bg-success/20 text-success border-success/20' 
                  : 'bg-warning/10 hover:bg-warning/20 text-warning border-warning/20'
              } disabled:opacity-50`}
            >
              {overview.sales_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {overview.sales_paused ? "Resume Sales" : "Pause Sales"}
            </button>
            <button 
              onClick={toggleWaitlist}
              disabled={updating}
              title={overview.waitlist_enabled ? "Waitlist is enabled for when tickets sell out. Click to disable." : "Enable waitlist for when tickets sell out"}
              className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                overview.waitlist_enabled
                  ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
              } disabled:opacity-50`}
            >
              <ListPlus className="w-4 h-4" />
              {overview.waitlist_enabled ? "Waitlist Enabled" : "Enable Waitlist"}
            </button>
            <button 
              onClick={async () => {
                if (!confirm("Are you sure you want to end this event? This action cannot be undone.")) return;
                setUpdating(true);
                try {
                  const updated = await updateEvent(session?.accessToken as string, id, { status: "COMPLETED" });
                  setOverview({ ...overview, status: updated.status });
                  toast.success("Event ended successfully.");
                } catch (err: any) {
                  toast.error(err.message || "Failed to end event.");
                } finally {
                  setUpdating(false);
                }
              }}
              disabled={updating || overview.status === "COMPLETED"}
              className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" />
              End Event
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Main Stats Card */}
        <div className="md:col-span-2 bg-background border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-32 h-32 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium mb-1">Live Check-in Progress</p>
            <div className="flex items-baseline gap-2 mb-6">
              <h2 className="text-5xl font-bold text-foreground">{overview.check_ins}</h2>
              <span className="text-xl text-muted-foreground font-medium">/ {overview.total_capacity}</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-foreground">{checkInPercent}% Capacity Reached</span>
              <span className="text-muted-foreground">{remaining} Remaining</span>
            </div>
            <div className="w-full bg-secondary h-4 rounded-full overflow-hidden border border-border/50">
              <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${checkInPercent}%` }}></div>
            </div>
          </div>
        </div>
        
        {/* Secondary Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex-1">
            <div className="flex justify-between items-start mb-2">
              <p className="text-muted-foreground font-medium">Total Tickets Sold</p>
              <Ticket className="w-5 h-5 text-primary/60" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">{ticketsSold}</h3>
            <p className="text-sm text-success font-medium mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Tracking Live
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
