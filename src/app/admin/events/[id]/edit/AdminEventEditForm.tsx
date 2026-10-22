'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Loader2, CheckCircle, Plus, Trash2, AlertTriangle,
  Image as ImageIcon, Calendar, MapPin, Users, Tag, Ticket,
  ToggleLeft, ToggleRight, Upload
} from 'lucide-react';
import { adminEditEvent, adminCreateTicketType, adminUpdateTicketType, adminDeleteTicketType } from '@/lib/api/admin';
import { API_URL } from '@/lib/api/config';

const TIER_OPTIONS = ['FREE', 'EARLY_BIRD', 'REGULAR', 'VIP', 'VVIP', 'CUSTOM'];
const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'LIVE', 'COMPLETED', 'ARCHIVED', 'REJECTED'];
const EVENT_TYPE_OPTIONS = ['PHYSICAL', 'ONLINE', 'HYBRID'];

interface TicketTypeRow {
  id?: number;
  name: string;
  tier: string;
  description: string;
  price_naira: number;
  quantity: number;
  quantity_sold: number;
  sale_start: string;
  sale_end: string;
  is_active: boolean;
  sort_order: number;
  isNew?: boolean;
  toDelete?: boolean;
}

interface Props {
  event: any;
  ticketTypes: any[];
  allOrganizers: { id: number; company_name: string; email: string }[];
  token: string;
}

export default function AdminEventEditForm({ event, ticketTypes, allOrganizers, token }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    cover_image: event.cover_image || '',
    event_type: event.event_type || 'PHYSICAL',
    status: event.status || 'DRAFT',
    country: event.country || '',
    state: event.state || '',
    city: event.city || '',
    location_name: event.location_name || '',
    start_time: event.start_time ? event.start_time.slice(0, 16) : '',
    end_time: event.end_time ? event.end_time.slice(0, 16) : '',
    capacity: event.capacity || 0,
    organizer_contact: event.organizer_contact || '',
    instagram_handle: event.instagram_handle || '',
    tiktok_handle: event.tiktok_handle || '',
    emergency_contact: event.emergency_contact || '',
    age_restriction: event.age_restriction || '',
    dress_code: event.dress_code || '',
    lineup: event.lineup || '',
    absorb_fees: event.absorb_fees ?? false,
    sales_paused: event.sales_paused ?? false,
    waitlist_enabled: event.waitlist_enabled ?? false,
    organizer_id: event.organizer_id || '',
  });

  const [tickets, setTickets] = useState<TicketTypeRow[]>(
    ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      tier: tt.tier,
      description: tt.description || '',
      price_naira: tt.price_naira,
      quantity: tt.quantity,
      quantity_sold: tt.quantity_sold,
      sale_start: tt.sale_start ? tt.sale_start.slice(0, 16) : '',
      sale_end: tt.sale_end ? tt.sale_end.slice(0, 16) : '',
      is_active: tt.is_active,
      sort_order: tt.sort_order,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));
  const toggle = (field: string) => setForm(f => ({ ...f, [field]: !(f as any)[field] }));

  // ── Image upload via presigned URL ─────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const presignRes = await fetch(`${API_URL}/upload/presigned-url/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, folder: 'events' }),
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { upload_url, public_url } = await presignRes.json();

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image');

      setField('cover_image', public_url);
    } catch (e: any) {
      setError('Image upload failed: ' + e.message);
    } finally {
      setImageUploading(false);
    }
  };

  // ── Ticket helpers ─────────────────────────────────────────────────────────
  const addTicket = () => {
    setTickets(prev => [...prev, {
      name: '',
      tier: 'REGULAR',
      description: '',
      price_naira: 0,
      quantity: 100,
      quantity_sold: 0,
      sale_start: '',
      sale_end: '',
      is_active: true,
      sort_order: prev.length,
      isNew: true,
    }]);
  };

  const updateTicket = (index: number, field: string, value: any) => {
    setTickets(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const removeTicket = (index: number) => {
    const tt = tickets[index];
    if (tt.quantity_sold > 0) return; // safety guard
    if (tt.isNew) {
      setTickets(prev => prev.filter((_, i) => i !== index));
    } else {
      setTickets(prev => prev.map((t, i) => i === index ? { ...t, toDelete: true } : t));
    }
  };

  // ── Save everything ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. Save event
      await adminEditEvent(token, event.id, {
        ...form,
        capacity: Number(form.capacity),
        organizer_id: form.organizer_id ? Number(form.organizer_id) : undefined,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      });

      // 2. Delete marked ticket types
      for (const tt of tickets) {
        if (tt.toDelete && tt.id) {
          await adminDeleteTicketType(token, tt.id);
        }
      }

      // 3. Create / update ticket types
      for (const tt of tickets.filter(t => !t.toDelete)) {
        const payload = {
          name: tt.name,
          tier: tt.tier,
          description: tt.description,
          price_naira: Number(tt.price_naira),
          quantity: Number(tt.quantity),
          sale_start: tt.sale_start || null,
          sale_end: tt.sale_end || null,
          is_active: tt.is_active,
          sort_order: tt.sort_order,
        };
        if (tt.isNew) {
          await adminCreateTicketType(token, event.id, payload);
        } else if (tt.id) {
          await adminUpdateTicketType(token, tt.id, payload);
        }
      }

      setSuccess(true);
      setTimeout(() => router.push('/admin/events'), 1200);
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ field }: { field: string }) => (
    <button
      type="button"
      onClick={() => toggle(field)}
      className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        (form as any)[field]
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-secondary text-muted-foreground'
      }`}
    >
      {(form as any)[field] ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {(form as any)[field] ? 'ON' : 'OFF'}
    </button>
  );

  const Input = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <input
        type={type}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        value={(form as any)[field]}
        onChange={e => setField(field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const visibleTickets = tickets.filter(t => !t.toDelete);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
          <p className="text-sm text-muted-foreground mt-1">#{event.id} · {event.slug}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
        >
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
            saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
            <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Event Details ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" /> Event Details
        </h2>

        <Input label="Title" field="title" placeholder="Event title" />

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            rows={4}
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            placeholder="Event description"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.status}
              onChange={e => setField('status', e.target.value)}
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Event Type</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.event_type}
              onChange={e => setField('event_type', e.target.value)}
            >
              {EVENT_TYPE_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Reassign Organizer</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={form.organizer_id}
            onChange={e => setField('organizer_id', e.target.value)}
          >
            {allOrganizers.map(o => (
              <option key={o.id} value={o.id}>{o.company_name} — {o.email}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Cover Image ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" /> Cover Image
        </h2>

        {form.cover_image && (
          <div className="relative rounded-xl overflow-hidden aspect-video w-full max-w-sm border border-border">
            <img src={form.cover_image} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={form.cover_image}
            onChange={e => setField('cover_image', e.target.value)}
            placeholder="https://... (paste S3 URL or upload below)"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageUploading}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {imageUploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
        </div>
      </section>

      {/* ── Date & Location ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Date & Location
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Start Time" field="start_time" type="datetime-local" />
          <Input label="End Time" field="end_time" type="datetime-local" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Country" field="country" placeholder="Nigeria" />
          <Input label="State" field="state" placeholder="Lagos" />
          <Input label="City" field="city" placeholder="Ikeja" />
        </div>
        <Input label="Location / Venue Name" field="location_name" placeholder="e.g. Eko Hotel, Lagos" />
      </section>

      {/* ── Additional Info ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Additional Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Capacity" field="capacity" type="number" placeholder="0 = unlimited" />
          <Input label="Organizer Contact (phone/email)" field="organizer_contact" />
          <Input label="Instagram Handle" field="instagram_handle" placeholder="@handle" />
          <Input label="TikTok Handle" field="tiktok_handle" placeholder="@handle" />
          <Input label="Age Restriction" field="age_restriction" placeholder="e.g. 18+" />
          <Input label="Dress Code" field="dress_code" placeholder="e.g. Smart Casual" />
          <Input label="Emergency Contact" field="emergency_contact" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Lineup / Artists</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            rows={3}
            value={form.lineup}
            onChange={e => setField('lineup', e.target.value)}
            placeholder="List artists or performers"
          />
        </div>
      </section>

      {/* ── Toggles ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Event Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Absorb Fees</p>
            <p className="text-xs text-muted-foreground mb-2">Organizer pays the 5% CirclePass fee</p>
            <Toggle field="absorb_fees" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Pause Sales</p>
            <p className="text-xs text-muted-foreground mb-2">Temporarily stop ticket purchases</p>
            <Toggle field="sales_paused" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Waitlist</p>
            <p className="text-xs text-muted-foreground mb-2">Enable waitlist when sold out</p>
            <Toggle field="waitlist_enabled" />
          </div>
        </div>
      </section>

      {/* ── Ticket Types ── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> Ticket Types ({visibleTickets.length})
          </h2>
          <button
            type="button"
            onClick={addTicket}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-primary/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Ticket Type
          </button>
        </div>

        {visibleTickets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            No ticket types yet. Click "Add Ticket Type" to create one.
          </div>
        )}

        <div className="space-y-4">
          {tickets.map((tt, index) => {
            if (tt.toDelete) return null;
            const hasSales = (tt.quantity_sold || 0) > 0;

            return (
              <div key={index} className={`border rounded-xl p-4 space-y-3 ${tt.isNew ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tt.isNew && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">NEW</span>}
                    {hasSales && (
                      <span className="text-[10px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> {tt.quantity_sold} sold
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground">{tt.name || 'Untitled Ticket'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => updateTicket(index, 'is_active', !tt.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                        tt.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {tt.is_active ? 'Active' : 'Inactive'}
                    </button>
                    {/* Delete */}
                    {hasSales ? (
                      <span className="text-xs text-muted-foreground px-2">Can't delete (has sales)</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeTicket(index)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-muted-foreground block mb-1">Name</label>
                    <input
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.name}
                      onChange={e => updateTicket(index, 'name', e.target.value)}
                      placeholder="e.g. VIP Table"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Tier</label>
                    <select
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.tier}
                      onChange={e => updateTicket(index, 'tier', e.target.value)}
                    >
                      {TIER_OPTIONS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Price (₦)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.price_naira}
                      onChange={e => updateTicket(index, 'price_naira', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Total Qty {hasSales ? <span className="text-warning">(min {tt.quantity_sold})</span> : ''}
                    </label>
                    <input
                      type="number"
                      min={tt.quantity_sold || 0}
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.quantity}
                      onChange={e => updateTicket(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Sale Start</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.sale_start}
                      onChange={e => updateTicket(index, 'sale_start', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Sale End</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.sale_end}
                      onChange={e => updateTicket(index, 'sale_end', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
                    <input
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={tt.description}
                      onChange={e => updateTicket(index, 'description', e.target.value)}
                      placeholder="Brief ticket description"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between py-4 border-t border-border sticky bottom-0 bg-background/95 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">All changes saved together when you click Save.</p>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70 shadow"
        >
          {success ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
            saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
            <><Save className="w-4 h-4" /> Save All Changes</>}
        </button>
      </div>
    </div>
  );
}
