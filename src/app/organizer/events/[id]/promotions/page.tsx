"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Percent, Tag, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { getEventDiscounts, getEventReferrals } from "@/lib/api/events";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export default function PromotionsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [discountCount, setDiscountCount] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || !id) return;
    const token = session.accessToken as string;

    getEventDiscounts(token, id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        // Referral-type rows are shown under Referrals, not here.
        setDiscountCount(
          rows.filter((d: any) => (d.type || d.discount_type) !== "REFERRAL").length,
        );
      })
      .catch(() => setDiscountCount(0));

    getEventReferrals(token, id)
      .then((data) => setReferralCount(Array.isArray(data) ? data.length : 0))
      .catch((err: any) => {
        setReferralCount(0);
        toast.error(err.message || "Could not load referrals");
      });
  }, [id, session?.accessToken, status]);

  const base = `/organizer/events/${id}/promotions`;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-2xl bg-primary/15 text-primary items-center justify-center">
          <Tag className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage discount and referral codes for this event.
          </p>
        </div>
      </header>

      {/* DISCOUNTS */}
      <section className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <Percent className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground">Discounts</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Create discount codes to offer attendees reduced ticket prices.
              </p>
              <span className="inline-flex items-center mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {discountCount === null
                  ? "Loading discount codes..."
                  : `${plural(discountCount, "discount code")} created`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-72 lg:shrink-0 lg:border-l lg:border-border lg:pl-6">
            <Link
              href={`${base}/discounts/create`}
              className="w-full text-center bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Discount Code
            </Link>
            <Link
              href={`${base}/discounts`}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
            >
              View All Discount Codes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* REFERRALS */}
      <section className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground">Referrals</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Create referral codes to track who generates ticket sales for
                this event.
              </p>
              <span className="inline-flex items-center mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {referralCount === null
                  ? "Loading referral codes..."
                  : `${plural(referralCount, "referral code")} created`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-72 lg:shrink-0 lg:border-l lg:border-border lg:pl-6">
            <Link
              href={`${base}/referrals/create`}
              className="w-full text-center bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Referral
            </Link>
            <Link
              href={`${base}/referrals`}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
            >
              View All Referrals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
