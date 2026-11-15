"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Link2, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/context/AuthContext";
import { createEventReferral, getEventById } from "@/lib/api/events";
import { copyToClipboard } from "../../_lib/attendees";

export default function CreateReferralPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || !id) return;
    getEventById(session.accessToken as string, id)
      .then((event) => setSlug(event?.slug || ""))
      .catch(() => setSlug(""));
  }, [id, session?.accessToken, status]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://thecirclepass.com";
  const previewLink = slug
    ? `${origin}/events/${slug}?ref=${encodeURIComponent(code.trim().toUpperCase() || "YOURCODE")}`
    : "";

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Enter a referral name.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createEventReferral(session?.accessToken as string, id, {
        name: name.trim(),
        code: code.trim(),
      });
      toast.success(`Referral ${created.code} created`);
      router.push(`/organizer/events/${id}/promotions/referrals/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create referral");
      setSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Create Referral</h1>
          <p className="text-sm text-muted-foreground">
            Referrals track who generated a sale. They never change the ticket
            price.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Referral Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Sarah"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Referral Code
            </label>
            <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
              <span className="flex items-center px-3 bg-secondary border-r border-border">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                }
                className="w-full bg-transparent px-3 py-2 text-foreground uppercase focus:outline-none font-mono"
                placeholder="SARAH25"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Letters, numbers, dashes and underscores. Leave empty and we will
              build one from the name.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Referral Link
            </label>
            <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden">
              <span className="flex items-center px-3 bg-secondary border-r border-border">
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </span>
              <input
                readOnly
                value={previewLink || "Loading event link..."}
                className="w-full bg-transparent px-3 py-2 text-xs text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(previewLink, "Referral link copied")}
                disabled={!previewLink}
                className="px-3 text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Copy referral link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Generated automatically once the referral code is created.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => router.push(`/organizer/events/${id}/promotions/referrals`)}
            disabled={submitting}
            className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
