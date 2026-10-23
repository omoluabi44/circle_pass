'use client';

import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TransferEventModal from '@/components/admin/TransferEventModal';

interface Props {
  eventId: number;
  eventTitle: string;
  currentOrganizerName: string;
  token: string;
}

export default function TransferOrganizerEventButton({ eventId, eventTitle, currentOrganizerName, token }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 border border-border"
        title="Transfer this event to another organizer"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
        <span>Transfer</span>
      </button>

      {open && (
        <TransferEventModal
          eventId={eventId}
          eventTitle={eventTitle}
          currentOrganizerName={currentOrganizerName}
          token={token}
          onClose={() => setOpen(false)}
          onTransferred={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
