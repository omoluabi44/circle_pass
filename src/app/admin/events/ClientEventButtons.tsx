"use client";

import { useState } from "react";
import { approveEvent, rejectEvent, deleteAdminEvent } from "@/lib/api/admin";
import { CheckCircle, XCircle, Trash2, Loader2, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import TransferEventModal from "@/components/admin/TransferEventModal";

export default function ClientEventButtons({ 
  id, 
  token, 
  status,
  title,
  organizerName,
}: { 
  id: number; 
  token: string; 
  status?: string;
  title?: string;
  organizerName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
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
    <>
      <div className="flex items-center gap-1.5">
        {/* Transfer Button */}
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          title="Transfer Event to another organizer"
          className="px-2 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Transfer</span>
        </button>

        {status === 'UNDER_REVIEW' && (
          <>
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
          </>
        )}

        <button 
          onClick={handleDelete}
          title="Delete Event"
          className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {transferOpen && (
        <TransferEventModal
          eventId={id}
          eventTitle={title || `Event #${id}`}
          currentOrganizerName={organizerName}
          token={token}
          onClose={() => setTransferOpen(false)}
          onTransferred={() => {
            setTransferOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
