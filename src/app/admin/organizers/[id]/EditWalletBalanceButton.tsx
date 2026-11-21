'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EditWalletBalanceModal = dynamic(() => import('./EditWalletBalanceModal'), { ssr: false });

interface Props {
  organizerId: number;
  organizerName: string;
  availableBalance: number; // kobo
  pendingBalance: number; // kobo
  token: string;
}

export default function EditWalletBalanceButton({
  organizerId,
  organizerName,
  availableBalance,
  pendingBalance,
  token,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
      >
        <Banknote className="w-3.5 h-3.5" /> Edit balance
      </button>

      {open && (
        <EditWalletBalanceModal
          organizerId={organizerId}
          organizerName={organizerName}
          availableBalance={availableBalance}
          pendingBalance={pendingBalance}
          token={token}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
