"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, ExternalLink, Trash2, UserPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { deleteEventReferral, getEventReferral } from "@/lib/api/events";
import AttendeeList from "../../_components/AttendeeList";
import { copyToClipboard } from "../../_lib/attendees";

export default function ReferralDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const referralId = params?.referralId as string;
  const { data: session, status } = useSession();

  const [referral, setReferral] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || !id || !referralId) return;
    getEventReferral(session.accessToken as string, id, referralId)
      .then(setReferral)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, referralId, session?.accessToken, status]);

  const remove = async () => {
    if (!referral) return;
    if (!confirm("Delete this referral code? Past orders keep their attribution.")) return;
    setBusy(true);
    try {
      await deleteEventReferral(session?.accessToken as string, id, referral.id);
      toast.success("Referral deleted");
      router.push(`/organizer/events/${id}/promotions/referrals`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete referral");
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading referral...</p>;
  }

  if (notFound || !referral) {
    return (
      <div className="space-y-4">
        <Link
          href={`/organizer/events/${id}/promotions/referrals`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to referrals
        </Link>
        <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          This referral no longer exists for this event.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href={`/organizer/events/${id}/promotions/referrals`}
          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
          title="Back to referrals"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referral Details</h1>
          <p className="text-sm text-muted-foreground">
            Tracking only — no discounts, commissions or payouts.
          </p>
        </div>
      </div>

      <section className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {referral.name}
            </h2>
            <p className="text-sm text-muted-foreground font-mono">{referral.code}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Referral Link
          </p>
          <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden">
            <input
              readOnly
              value={referral.referral_link}
              className="w-full bg-transparent px-3 py-2 text-xs text-muted-foreground focus:outline-none"
            />
            <button
              onClick={() => copyToClipboard(referral.referral_link, "Referral link copied")}
              className="px-3 text-muted-foreground hover:text-foreground border-l border-border"
              title="Copy referral link"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={referral.referral_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 flex items-center text-muted-foreground hover:text-foreground border-l border-border"
              title="Open referral link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 max-w-sm">
          <div className="rounded-xl bg-secondary/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Successful Sales
            </p>
            <p className="text-2xl font-bold text-foreground">
              {referral.sales_count ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Tickets Sold
            </p>
            <p className="text-2xl font-bold text-foreground">
              {referral.ticket_count ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <button
            onClick={remove}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Referral
          </button>
        </div>
      </section>

      <AttendeeList
        token={session?.accessToken as string}
        eventId={id}
        code={referral.code}
        heading={referral.name}
      />
    </div>
  );
}
