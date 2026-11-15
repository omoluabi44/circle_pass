"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/context/AuthContext";
import { getEventById } from "@/lib/api/events";
import DiscountForm from "../../_components/DiscountForm";

export default function CreateDiscountPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  const [ticketClasses, setTicketClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || !id) return;
    getEventById(session.accessToken as string, id)
      .then((event) => setTicketClasses(event?.ticket_types || []))
      .catch(() => setTicketClasses([]))
      .finally(() => setLoading(false));
  }, [id, session?.accessToken, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href={`/organizer/events/${id}/promotions/discounts`}
          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
          title="Back to discount codes"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Discount Code</h1>
          <p className="text-sm text-muted-foreground">
            Reduced ticket prices for this event only.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading ticket classes...</p>
      ) : (
        <DiscountForm
          token={session?.accessToken as string}
          eventId={id}
          ticketClasses={ticketClasses}
        />
      )}
    </div>
  );
}
