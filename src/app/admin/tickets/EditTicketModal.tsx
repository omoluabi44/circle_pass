'use client';

import { useState } from 'react';
import { X, Save, Loader2, CheckCircle, Ticket, Mail, User, ShieldAlert, ExternalLink, Trash2 } from 'lucide-react';
import { adminUpdateTicket, adminDeleteTicket } from '@/lib/api/admin';

interface TicketData {
  id: number;
  qr_token: string;
  status: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type_id: number;
  ticket_type_name: string;
  price_naira: number;
  order_number: string;
  event_title: string;
}

interface Props {
  ticket: TicketData;
  availableTypes: { id: number; name: string; tier: string; price: number }[];
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_CHOICES = ['ISSUED', 'ACTIVE', 'USED', 'INVALIDATED', 'PENDING', 'EXPIRED'];

export default function EditTicketModal({ ticket, availableTypes, token, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    attendee_name: ticket.attendee_name || '',
    attendee_email: ticket.attendee_email || '',
    status: ticket.status || 'ISSUED',
    ticket_type_id: ticket.ticket_type_id ? String(ticket.ticket_type_id) : '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminUpdateTicket(token, ticket.id, {
        attendee_name: form.attendee_name,
        attendee_email: form.attendee_email,
        status: form.status,
        ticket_type_id: form.ticket_type_id ? Number(form.ticket_type_id) : undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (e: any) {
      setError(e.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ticket? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await adminDeleteTicket(token, ticket.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" /> Edit Ticket #{ticket.id}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{ticket.event_title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Ticket metadata banner */}
          <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">QR Token:</span>
              <span className="font-mono font-bold text-foreground truncate max-w-[200px]">{ticket.qr_token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Order #:</span>
              <span className="font-mono text-foreground font-semibold">{ticket.order_number}</span>
            </div>
            <div className="pt-2 border-t border-border/50 flex justify-end">
              <a
                href={`/t/${ticket.qr_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                View Digital Ticket Pass <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Attendee Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Attendee Name
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.attendee_name}
              onChange={e => setForm(f => ({ ...f, attendee_name: e.target.value }))}
              placeholder="Attendee full name"
            />
          </div>

          {/* Attendee Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Attendee Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.attendee_email}
              onChange={e => setForm(f => ({ ...f, attendee_email: e.target.value }))}
              placeholder="attendee@example.com"
            />
          </div>

          {/* Ticket Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Ticket Status
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {STATUS_CHOICES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Set to <strong>USED</strong> to mark as checked-in, or <strong>INVALIDATED</strong> to void the pass.
            </p>
          </div>

          {/* Ticket Type (Tier) */}
          {availableTypes.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Ticket Type / Tier
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.ticket_type_id}
                onChange={e => setForm(f => ({ ...f, ticket_type_id: e.target.value }))}
              >
                {availableTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.tier}) — ₦{(t.price / 100).toLocaleString('en-NG')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || success}
              className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
                saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
                <><Save className="w-4 h-4" /> Save Ticket</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
