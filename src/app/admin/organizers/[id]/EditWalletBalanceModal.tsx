'use client';

import { useMemo, useState } from 'react';
import { X, Save, Loader2, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';
import { adminSetOrganizerWallet } from '@/lib/api/admin';

interface Props {
  organizerId: number;
  organizerName: string;
  availableBalance: number; // kobo
  pendingBalance: number; // kobo
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

/** "143,000.50" / "₦143000" -> kobo, or null when it is not a number. */
function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

function formatKobo(kobo: number | null): string {
  if (kobo === null) return '—';
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export default function EditWalletBalanceModal({
  organizerId,
  organizerName,
  availableBalance,
  pendingBalance,
  token,
  onClose,
  onSaved,
}: Props) {
  const [availableInput, setAvailableInput] = useState(
    (availableBalance / 100).toFixed(2),
  );
  const [pendingInput, setPendingInput] = useState(
    (pendingBalance / 100).toFixed(2),
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nextAvailable = useMemo(() => nairaToKobo(availableInput), [availableInput]);
  const nextPending = useMemo(() => nairaToKobo(pendingInput), [pendingInput]);
  const availableDelta =
    nextAvailable === null ? null : nextAvailable - availableBalance;
  const pendingDelta = nextPending === null ? null : nextPending - pendingBalance;

  const invalid =
    nextAvailable === null ||
    nextPending === null ||
    (availableDelta === 0 && pendingDelta === 0);

  const handleSave = async () => {
    if (nextAvailable === null || nextPending === null) {
      setError('Enter the balances as numbers, e.g. 143000 or 143,000.50');
      return;
    }
    if (availableDelta === 0 && pendingDelta === 0) {
      setError('The balance is already that figure — nothing to change.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: { available_balance: number; pending_balance: number; reason?: string } = {
        available_balance: nextAvailable,
        pending_balance: nextPending,
      };
      if (reason.trim()) payload.reason = reason.trim();

      const result = await adminSetOrganizerWallet(token, organizerId, payload);
      setSuccess(result.message || 'Balance updated.');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 900);
    } catch (e: any) {
      setError(e.message || 'Failed to update the balance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Edit Wallet Balance
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{organizerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="bg-secondary/60 border border-border/80 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <span>
              This changes how much the organizer can withdraw. Use it when money was
              already sent to them outside CirclePass, or to correct a balance. Every
              change is written to their wallet history with your email on it.
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Available balance (₦)
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={availableInput}
              onChange={(e) => setAvailableInput(e.target.value)}
              inputMode="decimal"
              placeholder="143000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Currently {formatKobo(availableBalance)}
              {availableDelta !== null && availableDelta !== 0 && (
                <>
                  {' → '}
                  <span className={availableDelta > 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                    {formatKobo(nextAvailable)} ({availableDelta > 0 ? '+' : ''}
                    {formatKobo(availableDelta)})
                  </span>
                </>
              )}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Pending balance (₦)
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={pendingInput}
              onChange={(e) => setPendingInput(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Currently {formatKobo(pendingBalance)}. Funds not yet past the release date.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Reason <span className="font-normal">(recorded in the wallet history)</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. ₦44,000 already sent by transfer"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || invalid || !!success}
            className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {success ? (
              <><CheckCircle className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save balance</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
