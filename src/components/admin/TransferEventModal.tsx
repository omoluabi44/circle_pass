'use client';

import { useState } from 'react';
import { X, ArrowRightLeft, Loader2, CheckCircle, AlertCircle, Building2, Mail } from 'lucide-react';
import { adminTransferEvent } from '@/lib/api/admin';

interface Props {
  eventId: number;
  eventTitle: string;
  currentOrganizerName?: string;
  allOrganizers?: { id: number; company_name: string; email: string }[];
  token: string;
  onClose: () => void;
  onTransferred: () => void;
}

export default function TransferEventModal({
  eventId,
  eventTitle,
  currentOrganizerName,
  allOrganizers = [],
  token,
  onClose,
  onTransferred,
}: Props) {
  const [mode, setMode] = useState<'select' | 'email'>('select');
  const [selectedOrgId, setSelectedOrgId] = useState(allOrganizers[0]?.id ? String(allOrganizers[0].id) : '');
  const [targetEmail, setTargetEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleTransfer = async () => {
    setTransferring(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = mode === 'select'
        ? { organizer_id: selectedOrgId }
        : { email: targetEmail.trim() };

      if (mode === 'email' && !targetEmail.trim()) {
        setError('Please enter the recipient organizer email.');
        setTransferring(false);
        return;
      }

      const res = await adminTransferEvent(token, eventId, payload);
      setSuccessMsg(res.message || 'Event transferred successfully!');
      setTimeout(() => {
        onTransferred();
        onClose();
      }, 1200);
    } catch (e: any) {
      setError(e.message || 'Failed to transfer event');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Transfer Event Ownership</h3>
                <p className="text-xs text-muted-foreground">Move this event and all tickets to a new organizer</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Event Info */}
          <div className="bg-secondary/40 border border-border rounded-xl p-3.5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Event:</span>
              <span className="font-bold text-foreground truncate max-w-[260px]">{eventTitle}</span>
            </div>
            {currentOrganizerName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Current Organizer:</span>
                <span className="font-semibold text-foreground">{currentOrganizerName}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-secondary p-1 border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('select')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'select' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Choose Existing Organizer
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Enter User Email
            </button>
          </div>

          {/* Form Content */}
          {mode === 'select' ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Select New Organizer
              </label>
              {allOrganizers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No organizers loaded. Switch to "Enter User Email" above to transfer by email.
                </p>
              ) : (
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={selectedOrgId}
                  onChange={e => setSelectedOrgId(e.target.value)}
                >
                  {allOrganizers.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.company_name} ({org.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                placeholder="organizer@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={targetEmail}
                onChange={e => setTargetEmail(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                If this user is currently an attendee, CirclePass will automatically grant them organizer status and attach their profile!
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-success/10 border border-success/20 text-success text-xs rounded-xl p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={transferring || !!successMsg}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {transferring ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Transferring…</>
              ) : (
                <><ArrowRightLeft className="w-4 h-4" /> Transfer Event</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
