"use client";

import { useState } from "react";
import { approvePayout, rejectPayout } from "@/lib/api/admin";
import { CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientPayoutButtons({ id, token }: { id: number, token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this payout? This assumes you have already transferred the funds manually.")) {
      return;
    }
    setLoading(true);
    try {
      await approvePayout(token, id);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectPayout(token, id, "Rejected by admin");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={handleApprove}
        disabled={loading}
        className="flex items-center gap-1 bg-success/10 text-success hover:bg-success/20 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
      </button>
      <button 
        onClick={handleReject}
        disabled={loading}
        className="flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        <XCircle className="w-3.5 h-3.5" /> Reject
      </button>
    </>
  );
}
