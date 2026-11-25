"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { getEventById, getEventDiscounts } from "@/lib/api/events";

export default function DiscountCodeListPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [discounts, setDiscounts] = useState<any[]>([]);
  const [ticketClasses, setTicketClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!session?.accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, eventData] = await Promise.all([
        getEventDiscounts(session.accessToken as string, id),
        getEventById(session.accessToken as string, id).catch(() => null),
      ]);
      setDiscounts(
        (Array.isArray(data) ? data : []).filter(
          (d: any) => (d.type || d.discount_type) !== "REFERRAL",
        ),
      );
      setTicketClasses(eventData?.ticket_types || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch discounts");
      toast.error(err.message || "Failed to fetch discounts");
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
            <h1 className="text-2xl font-bold text-foreground">Discount Codes</h1>
            <p className="text-sm text-muted-foreground">
              Codes created for this event. Select one to manage it.
            </p>
          </div>
        </div>
        <Link
          href={`${base}/discounts/create`}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Discount Code
        </Link>
      </div>

      {error && discounts.length === 0 && (
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
        <p className="text-muted-foreground">Loading discounts...</p>
      ) : discounts.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          No discount codes created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map((discount) => {
            const isActive = discount.is_active !== false;
            const classes = (discount.ticket_type_ids || [])
              .map((tid: number) => ticketClasses.find((t: any) => t.id === tid)?.name)
              .filter(Boolean);
            return (
              <div
                key={discount.id}
                className="group bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`${base}/discounts/${discount.id}`}
                      className="text-lg font-bold text-foreground truncate hover:text-primary transition-colors block"
                    >
                      {discount.code}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {(discount.type || discount.discount_type) === "PERCENTAGE"
                        ? `${discount.value}% Off`
                        : `₦${(discount.value / 100).toLocaleString()} Off`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isActive ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium text-foreground">
                      {discount.usage_count ?? discount.times_used ?? 0} /{" "}
                      {discount.usage_limit ? discount.usage_limit : "∞"}
                    </span>
                  </div>
                  {discount.usage_limit > 0 && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            ((discount.usage_count ?? discount.times_used ?? 0) /
                              discount.usage_limit) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-sm gap-3">
                    <span className="text-muted-foreground flex-shrink-0">Applies to</span>
                    <span className="font-medium text-foreground text-right truncate">
                      {classes.length > 0 ? classes.join(", ") : "All ticket classes"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per person</span>
                    <span className="font-medium text-foreground">
                      {discount.allow_multiple_per_user === false
                        ? "Once only"
                        : "Multiple uses"}
                    </span>
                  </div>
                  {discount.valid_until && (
                    <div className="flex justify-between text-sm gap-3">
                      <span className="text-muted-foreground flex-shrink-0">Expires</span>
                      <span className="font-medium text-foreground text-right">
                        {new Date(discount.valid_until).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-sm font-medium">
                  <Link
                    href={`${base}/discounts/${discount.id}`}
                    className="text-primary inline-flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href={`${base}/discounts/${discount.id}/edit`}
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
