"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Copy, Plus, RefreshCw, UserPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { getEventReferrals } from "@/lib/api/events";
import { copyToClipboard } from "../_lib/attendees";

export default function ReferralListPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!session?.accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEventReferrals(session.accessToken as string, id);
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch referrals");
      toast.error(err.message || "Failed to fetch referrals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.accessToken, status]);

  const base = `/organizer/events/${id}/promotions`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href={base}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
            title="Back to Promotions"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
            <p className="text-sm text-muted-foreground">
              Tracking codes for this event. Select one to see its sales.
            </p>
          </div>
        </div>
        <Link
          href={`${base}/referrals/create`}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Referral
        </Link>
      </div>

      {error && referrals.length === 0 && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading referrals...</p>
      ) : referrals.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          No referral codes created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {referrals.map((referral) => (
            <div
              key={referral.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {referral.name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono truncate">
                      {referral.code}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl bg-secondary/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Sales
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {referral.sales_count ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tickets
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {referral.ticket_count ?? 0}
                  </p>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(referral.referral_link, "Referral link copied")}
                className="mt-4 flex items-center justify-center gap-2 border border-border text-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Referral Link
              </button>

              <Link
                href={`${base}/referrals/${referral.id}`}
                className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm font-medium text-primary"
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
