"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/context/AuthContext";
import { getEventById, getEventDiscounts } from "@/lib/api/events";
import DiscountForm from "../../../_components/DiscountForm";

export default function EditDiscountPage() {
  const params = useParams();
  const id = params?.id as string;
  const discountId = params?.discountId as string;
  const { data: session, status } = useSession();

  const [discount, setDiscount] = useState<any | null>(null);
  const [ticketClasses, setTicketClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || !id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getEventDiscounts(session.accessToken as string, id),
      getEventById(session.accessToken as string, id).catch(() => null),
    ])
      .then(([rows, eventData]) => {
        if (cancelled) return;
        const match = (Array.isArray(rows) ? rows : []).find(
          (d: any) => String(d.id) === String(discountId),
        );
        setDiscount(match || null);
        setNotFound(!match);
        setTicketClasses(eventData?.ticket_types || []);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.message || "Failed to load this discount");
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, discountId, session?.accessToken, status]);

  const backHref = `/organizer/events/${id}/promotions/discounts`;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href={`${backHref}/${discountId}`}
          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
          title="Back to discount details"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Discount Code</h1>
          <p className="text-sm text-muted-foreground">
            Update this code. Changes apply to new checkouts only.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading discount...</p>
      ) : notFound || !discount ? (
        <div className="space-y-4">
          <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            {error || "This discount code no longer exists for this event."}
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to discount codes
          </Link>
        </div>
      ) : (
        <DiscountForm
          key={discount.id}
          token={session?.accessToken as string}
          eventId={id}
          ticketClasses={ticketClasses}
          discount={discount}
        />
      )}
    </div>
  );
}
