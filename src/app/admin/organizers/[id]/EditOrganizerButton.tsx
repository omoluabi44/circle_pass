'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EditOrganizerModal = dynamic(() => import('./EditOrganizerModal'), { ssr: false });

interface Props {
  organizer: any;
  token: string;
}

export default function EditOrganizerButton({ organizer, token }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors hover:bg-primary/90"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit Profile
      </button>

      {open && (
        <EditOrganizerModal
          organizer={{ ...organizer, token }}
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
