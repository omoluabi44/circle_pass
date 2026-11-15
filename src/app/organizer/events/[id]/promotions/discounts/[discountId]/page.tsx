"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, PauseCircle, Percent, PlayCircle, Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import {
  deleteEventDiscount, getEventById, getEventDiscounts, updateEventDiscount,
} from "@/lib/api/events";
import AttendeeList from "../../_components/AttendeeList";

export default function DiscountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const discountId = params?.discountId as string;
  const { data: session, status } = useSession();

  const [discount, setDiscount] = useState<any | null>(null);
  const [ticketClasses, setTicketClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!session?.accessToken || !id) return;
    setLoading(true);
    try {
      const [rows, eventData] = await Promise.all([
        getEventDiscounts(session.accessToken as string, id),
        getEventById(session.accessToken as string, id).catch(() => null),
      ]);
      const match = (Array.isArray(rows) ? rows : []).find(
        (d: any) => String(d.id) === String(discountId),
      );
      setDiscount(match || null);
      setNotFound(!match);
      setTicketClasses(eventData?.ticket_types || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load this discount");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, discountId, session?.accessToken, status]);

  const toggleActive = async () => {
    if (!discount) return;
    const nextActive = discount.is_active === false;
    setBusy(true);
    try {
      const updated = await updateEventDiscount(
        session?.accessToken as string, id, discount.id, { is_active: nextActive },
      );
      setDiscount((prev: any) => ({ ...prev, is_active: updated.is_active }));
      toast.success(nextActive ? "Discount resumed." : "Discount paused.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update discount");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!discount) return;
    if (!confirm("Are you sure you want to delete this discount?")) return;
    setBusy(true);
    try {
      await deleteEventDiscount(session?.accessToken as string, id, discount.id);
      toast.success("Discount deleted");
      router.push(`/organizer/events/${id}/promotions/discounts`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete discount");
      setBusy(false);
    }
  };

  const base = `/organizer/events/${id}/promotions/discounts`;

  if (loading) {
    return <p className="text-muted-foreground">Loading discount...</p>;
  }

  if (notFound || !discount) {
    return (
      <div className="space-y-4">
        <Link href={base} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to discount codes
        </Link>
        <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          This discount code no longer exists for this event.
        </div>
      </div>
    );
  }

  const isActive = discount.is_active !== false;
  const classes = (discount.ticket_type_ids || [])
    .map((tid: number) => ticketClasses.find((t: any) => t.id === tid)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href={base}
          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
          title="Back to discount codes"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discount Details</h1>
          <p className="text-sm text-muted-foreground">
            Manage this code and see who bought with it.
          </p>
        </div>
      </div>

      <section className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">
                {discount.code}
              </h2>
              <p className="text-sm text-muted-foreground">
                {(discount.type || discount.discount_type) === "PERCENTAGE"
                  ? `${discount.value}% discount`
                  : `₦${(discount.value / 100).toLocaleString()} discount`}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-success/10 text-success"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {isActive ? "Active" : "Paused"}
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-6 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Max Uses</dt>
            <dd className="font-medium text-foreground">
              {discount.usage_limit ? discount.usage_limit : "Unlimited"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Used</dt>
            <dd className="font-medium text-foreground">
              {discount.usage_count ?? discount.times_used ?? 0}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Applies to</dt>
            <dd className="font-medium text-foreground text-right">
              {classes.length > 0 ? classes.join(", ") : "All ticket classes"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Per person</dt>
            <dd className="font-medium text-foreground">
              {discount.allow_multiple_per_user === false
                ? "Once only"
                : "Multiple uses"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium text-foreground text-right">
              {discount.valid_until
                ? new Date(discount.valid_until).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "No expiry"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium text-foreground text-right">
              {discount.created_at
                ? new Date(discount.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "-"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <button
            onClick={toggleActive}
            disabled={busy}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              isActive
                ? "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                : "text-success bg-success/10 hover:bg-success/20"
            }`}
          >
            {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
            {isActive ? "Pause Discount" : "Resume Discount"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </section>

      <AttendeeList
        token={session?.accessToken as string}
        eventId={id}
        code={discount.code}
        heading={discount.code}
      />
    </div>
  );
}
