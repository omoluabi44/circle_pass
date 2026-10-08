"use client";

import { useState } from "react";
import { approveEvent, rejectEvent, deleteAdminEvent } from "@/lib/api/admin";
import { CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientEventButtons({ id, token }: { id: number; token: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve and publish this event?")) return;
    setLoading(true);
    try {
      await approveEvent(token, id);
      router.refresh();
    } catch (err) {
      alert("Failed to approve event");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this event?")) return;
    setLoading(true);
    try {
      await rejectEvent(token, id);
      router.refresh();
    } catch (err) {
      alert("Failed to reject event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteAdminEvent(token, id);
      router.refresh();
    } catch (err) {
      alert("Failed to delete event");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
  }

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleApprove}
        title="Approve Event"
        className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
      </button>
      <button 
        onClick={handleReject}
        title="Reject Event"
        className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
      >
        <XCircle className="w-4 h-4" />
      </button>
      <button 
        onClick={handleDelete}
        title="Delete Event"
        className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
