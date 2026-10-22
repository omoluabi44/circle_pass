'use client';

import { useState } from 'react';
import { X, Save, Loader2, Building2, User, Mail, Phone, Globe, AtSign, Shield, CheckCircle } from 'lucide-react';
import { adminEditOrganizer } from '@/lib/api/admin';

interface OrganizerData {
  id: number;
  company_name: string;
  contact_email: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  bio: string;
  website: string;
  instagram_handle: string;
  is_verified: boolean;
  role?: string;
  token?: string;
}

interface Props {
  organizer: OrganizerData;
  token?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditOrganizerModal({ organizer, token: propToken, onClose, onSaved }: Props) {
  const token = propToken || organizer.token || '';

  const [form, setForm] = useState({
    first_name: organizer.first_name || '',
    last_name: organizer.last_name || '',
    email: organizer.email || '',
    phone: organizer.phone || '',
    role: organizer.role || 'ORGANIZER',
    company_name: organizer.company_name || '',
    contact_email: organizer.contact_email || '',
    bio: organizer.bio || '',
    website: organizer.website || '',
    instagram_handle: organizer.instagram_handle || '',
    is_verified: organizer.is_verified ?? false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await adminEditOrganizer(token, organizer.id, form);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Edit Organizer Profile
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{organizer.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Personal Info */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Personal Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">First Name</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Last Name</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Account Email</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                type="email"
                placeholder="account@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Role</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.role}
                onChange={e => set('role', e.target.value)}
              >
                <option value="ATTENDEE">ATTENDEE</option>
                <option value="ORGANIZER">ORGANIZER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </section>

          <hr className="border-border" />

          {/* Organizer Profile */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Organizer Profile
            </h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Company / Brand Name</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="e.g. Goat HQ Events"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Public Contact Email</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.contact_email}
                onChange={e => set('contact_email', e.target.value)}
                type="email"
                placeholder="contact@brand.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Bio</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Organizer bio / description"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.website}
                onChange={e => set('website', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1"><AtSign className="w-3 h-3" /> Instagram Handle</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.instagram_handle}
                onChange={e => set('instagram_handle', e.target.value)}
                placeholder="@handle"
              />
            </div>
          </section>

          <hr className="border-border" />

          {/* Verification */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Verification Status
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('is_verified', !form.is_verified)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.is_verified ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_verified ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium text-foreground">
                {form.is_verified ? 'Verified ✓' : 'Not Verified'}
              </span>
            </label>
          </section>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-3">
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
            {success ? (
              <><CheckCircle className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
