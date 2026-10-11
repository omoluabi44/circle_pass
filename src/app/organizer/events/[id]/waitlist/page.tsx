"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { 
  Clock, Users, CheckCircle2, XCircle, AlertCircle, 
  Ticket, RefreshCw, AlertTriangle, ShieldCheck, 
  HelpCircle, Check, X, Mail, Phone, Calendar
} from "lucide-react";
import { API_URL } from "@/lib/api/config";
import { getEventById, updateEvent } from "@/lib/api/events";

interface WaitlistEntry {
  id: number;
  name: string;
  email: string;
  phone?: string;
  ticket_type: number;
  ticket_type_name: string;
  ticket_type_tier: string;
  ticket_type_price: number;
  quantity: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "COMPLETED";
  created_at: string;
  reserved_until?: string;
  available_inventory: number;
}

interface TierInventory {
  id: number;
  name: string;
  tier: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  available: number;
  is_sold_out: boolean;
}

export default function OrganizerWaitlistPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [event, setEvent] = useState<any>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [tiersInventory, setTiersInventory] = useState<TierInventory[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
    completed: 0
  });

  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "ACCEPTED" | "COMPLETED" | "DECLINED" | "EXPIRED">("PENDING");
  const [togglingWaitlist, setTogglingWaitlist] = useState(false);

  const fetchWaitlistData = async (isManualRefresh = false) => {
    if (!session?.accessToken || !id) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch event
      const eventData = await getEventById(session.accessToken as string, id);
      setEvent(eventData);

      // 2. Fetch waitlist data
      const res = await fetch(`${API_URL}/events/${id}/waitlist/manage/`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error("Failed to load waitlist entries.");
      }

      const data = await res.json();
      setEntries(data.entries || []);
      setTiersInventory(data.tiers_inventory || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load waitlist.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authStatus === "loading") return;
    if (session?.accessToken && id) {
      fetchWaitlistData();
    }
  }, [id, session, authStatus]);

  const handleToggleWaitlist = async () => {
    if (!session?.accessToken || !id || !event) return;
    setTogglingWaitlist(true);
    try {
      const nextState = !event.waitlist_enabled;
      await updateEvent(session.accessToken as string, id, {
        waitlist_enabled: nextState
      });
      setEvent((prev: any) => ({ ...prev, waitlist_enabled: nextState }));
      toast.success(nextState ? "Waitlist enabled for this event." : "Waitlist disabled for new applications.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update waitlist setting.");
    } finally {
      setTogglingWaitlist(false);
    }
  };

  const handleAccept = async (entry: WaitlistEntry) => {
    if (!session?.accessToken || !id) return;

    // Check client-side inventory
    const tier = tiersInventory.find((t) => t.id === entry.ticket_type);
    const available = tier ? tier.available : entry.available_inventory;

    if (available < entry.quantity) {
      toast.error(
        `Cannot accept request: only ${available} ${entry.ticket_type_name} tickets available (requested: ${entry.quantity}).`
      );
      return;
    }

    const confirmMsg = `Accept waitlist request for ${entry.name || entry.email}?\n\nThis will temporarily reserve ${entry.quantity}x ${entry.ticket_type_name} tickets and send them a private checkout link to complete payment within 2 hours.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(entry.id);
    try {
      const res = await fetch(`${API_URL}/events/${id}/waitlist/${entry.id}/accept/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to accept request.");
      }

      toast.success(data.detail || "Request accepted! Tickets reserved.");
      await fetchWaitlistData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (entry: WaitlistEntry) => {
    if (!session?.accessToken || !id) return;

    const confirmMsg = `Are you sure you want to decline this request for ${entry.name || entry.email}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(entry.id);
    try {
      const res = await fetch(`${API_URL}/events/${id}/waitlist/${entry.id}/decline/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to decline request.");
      }

      toast.success("Waitlist request declined.");
      await fetchWaitlistData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to decline request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (activeTab === "ALL") return true;
    return entry.status === activeTab;
  });

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm font-medium">Loading waitlist applications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Waitlist Management</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              event?.waitlist_enabled 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {event?.waitlist_enabled ? "Waitlist Active" : "Waitlist Paused"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review attendee requests for sold-out tickets. You can manually accept requests whenever inventory becomes available.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWaitlistData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition disabled:opacity-50 text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleToggleWaitlist}
            disabled={togglingWaitlist}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              event?.waitlist_enabled
                ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            } disabled:opacity-50`}
          >
            {event?.waitlist_enabled ? "Pause Waitlist" : "Enable Waitlist"}
          </button>
        </div>
      </div>

      {/* Available Inventory Overview */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Current Ticket Inventory</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Inventory is updated in real-time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tiersInventory.map((tier) => (
            <div 
              key={tier.id}
              className={`p-4 rounded-xl border transition-all ${
                tier.available > 0 
                  ? "bg-emerald-500/5 border-emerald-500/20" 
                  : "bg-secondary/40 border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-bold text-foreground text-sm line-clamp-1">{tier.name}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  tier.available > 0
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {tier.available > 0 ? `${tier.available} left` : "Sold out"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-foreground">{tier.available}</span>
                  <span className="text-xs text-muted-foreground ml-1.5 font-medium">available</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {tier.quantity_sold} / {tier.quantity} sold
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-3xl font-extrabold text-foreground">{counts.pending}</span>
          <p className="text-[12px] text-muted-foreground mt-1">Awaiting organizer approval</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Reserved / Accepted</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <span className="text-3xl font-extrabold text-primary">{counts.accepted}</span>
          <p className="text-[12px] text-muted-foreground mt-1">Holding for checkout</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed / Paid</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-600">{counts.completed}</span>
          <p className="text-[12px] text-muted-foreground mt-1">Tickets issued</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Requests</span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-3xl font-extrabold text-foreground">{counts.total}</span>
          <p className="text-[12px] text-muted-foreground mt-1">Historical applications</p>
        </div>
      </div>

      {/* Waitlist Applications Table & Tabs */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-border px-6 pt-4 flex flex-wrap gap-2">
          {(["PENDING", "ACCEPTED", "COMPLETED", "DECLINED", "EXPIRED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors relative ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "ALL" ? "All Entries" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {tab === "ALL" ? counts.total : counts[tab.toLowerCase() as keyof typeof counts] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Content Table */}
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">No waitlist requests found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                {activeTab === "PENDING"
                  ? "There are currently no pending waitlist applications."
                  : `No requests with status "${activeTab}" found.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="pb-3 px-4">Attendee</th>
                    <th className="pb-3 px-4">Requested Tier</th>
                    <th className="pb-3 px-4">Quantity</th>
                    <th className="pb-3 px-4">Tier Availability</th>
                    <th className="pb-3 px-4">Date Applied</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntries.map((entry) => {
                    const tier = tiersInventory.find((t) => t.id === entry.ticket_type);
                    const currentAvailable = tier ? tier.available : entry.available_inventory;
                    const canAccept = currentAvailable >= entry.quantity;
                    const isProcessing = actionLoadingId === entry.id;

                    return (
                      <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                        {/* Attendee */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground text-sm">{entry.name || "Attendee"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" /> {entry.email}
                          </div>
                          {entry.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3" /> {entry.phone}
                            </div>
                          )}
                        </td>

                        {/* Requested Tier */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-foreground text-sm">{entry.ticket_type_name}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {entry.ticket_type_price === 0 ? "Free" : `₦${(entry.ticket_type_price / 100).toLocaleString()}`}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-4 px-4 font-mono font-bold text-sm text-foreground">
                          {entry.quantity}
                        </td>

                        {/* Tier Availability */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              currentAvailable >= entry.quantity
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}>
                              {currentAvailable} available
                            </span>
                            {!canAccept && entry.status === "PENDING" && (
                              <span className="text-[11px] text-destructive font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                Need {entry.quantity - currentAvailable} more
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date Applied */}
                        <td className="py-4 px-4 text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                            entry.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : entry.status === "ACCEPTED"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : entry.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : entry.status === "EXPIRED"
                              ? "bg-muted text-muted-foreground border border-border"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {entry.status === "PENDING" && <Clock className="w-3 h-3" />}
                            {entry.status === "ACCEPTED" && <Check className="w-3 h-3" />}
                            {entry.status === "COMPLETED" && <ShieldCheck className="w-3 h-3" />}
                            {entry.status === "DECLINED" && <X className="w-3 h-3" />}
                            {entry.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          {entry.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* Accept Button */}
                              <button
                                onClick={() => handleAccept(entry)}
                                disabled={!canAccept || isProcessing}
                                title={
                                  !canAccept
                                    ? `Cannot accept: Only ${currentAvailable} ticket(s) available, but attendee requested ${entry.quantity}.`
                                    : "Accept and reserve tickets for attendee"
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                  canAccept
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                } disabled:cursor-not-allowed`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isProcessing ? "Processing..." : "Accept"}
                              </button>

                              {/* Decline Button */}
                              <button
                                onClick={() => handleDecline(entry)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary hover:bg-destructive/10 text-destructive border border-border hover:border-destructive/20 transition flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Decline
                              </button>
                            </div>
                          ) : entry.status === "ACCEPTED" ? (
                            <span className="text-xs text-primary font-medium">
                              Reserved (awaiting payment)
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
