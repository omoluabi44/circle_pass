'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { QRScanner } from '@/components/checkin/QRScanner';
import { QrCode, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function StaffScanPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [scanCount, setScanCount] = useState(0);

  const handleSuccess = () => {
    setScanCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center">
            <QrCode className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-gray-900 font-heading tracking-tight">Staff Scanner</h1>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-gray-500 hover:text-gray-900 p-2"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 w-full max-w-md mx-auto relative">
        <div className="text-center mb-6 mt-4">
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-1">Session Check-ins</p>
          <p className="text-4xl font-black text-[#6366f1] font-heading">{scanCount}</p>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
            <QRScanner eventId={eventId} onSuccess={handleSuccess} />
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6 pb-4">
          PassControl Scanner Mode • Scans are logged to your account.
        </p>
      </main>
    </div>
  );
}
