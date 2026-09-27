'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { QRScanner } from '@/components/checkin/QRScanner';
import { ManualSearch } from '@/components/checkin/ManualSearch';
import { LiveFeed } from '@/components/checkin/LiveFeed';
import { QrCode, Search } from 'lucide-react';

export default function PassControlPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Called when a checkin succeeds (QR or manual)
  const onCheckInSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-heading">PassControl Check-in</h1>
          <p className="text-gray-500 mt-1">Scan tickets or manually check in attendees.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Check-in Area */}
        <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'qr'
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <QrCode size={20} />
              QR Scanner
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1] bg-[#6366f1]/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Search size={20} />
              Manual Search
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'qr' ? (
              <QRScanner eventId={eventId} onSuccess={onCheckInSuccess} />
            ) : (
              <ManualSearch eventId={eventId} onSuccess={onCheckInSuccess} />
            )}
          </div>
        </div>

        {/* Sidebar: Live Feed & Stats */}
        <div className="w-full lg:w-1/3">
          <LiveFeed eventId={eventId} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
