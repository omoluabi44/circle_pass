'use client';

import { useState, useEffect } from 'react';
import { 
  Ticket, Search, Filter, RefreshCw, ExternalLink, Pencil, AlertCircle, 
  CheckCircle, Plus, Trash2, Loader2, Tag, Calendar, Save, DollarSign 
} from 'lucide-react';
import Link from 'next/link';
import EditTicketModal from './EditTicketModal';
import { 
  getAdminTickets, getAdminTicketDetail, adminGetEventDetail,
  adminCreateTicketType, adminUpdateTicketType, adminDeleteTicketType 
} from '@/lib/api/admin';

interface Props {
  initialTickets: any[];
  initialTotal: number;
  eventsList: { id: number; title: string }[];
  token: string;
}

const STATUS_FILTERS = ['ALL', 'ISSUED', 'ACTIVE', 'USED', 'INVALIDATED', 'PENDING', 'EXPIRED'];
const TIER_OPTIONS = ['FREE', 'EARLY_BIRD', 'REGULAR', 'VIP', 'VVIP', 'CUSTOM'];

export default function AdminTicketsClient({ initialTickets, initialTotal, eventsList, token }: Props) {
  const [activeTab, setActiveTab] = useState<'attendee_tickets' | 'pricing'>('attendee_tickets');

  // ─── Attendee Tickets State ─────────────────────────────────────────────────
  const [tickets, setTickets] = useState(initialTickets);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('');
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);

  // ─── Pricing / Event Tiers State ───────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<string>(eventsList[0]?.id ? String(eventsList[0].id) : '');
  const [eventTiers, setEventTiers] = useState<any[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);
  const [tierSuccess, setTierSuccess] = useState(false);
  const [tierError, setTierError] = useState('');

  // Fetch / Refresh Attendee Tickets
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await getAdminTickets(token, {
        q: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        event_id: eventFilter || undefined,
      });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openEditTicket = async (t: any) => {
    try {
      const detail = await getAdminTicketDetail(token, t.id);
      setEditingTicket(detail.ticket);
      setAvailableTypes(detail.available_types || []);
    } catch (e) {
      setEditingTicket(t);
      setAvailableTypes([]);
    }
  };

  // Fetch Event Tiers when event changes
  const fetchEventTiers = async (eventId: string) => {
    if (!eventId) return;
    setLoadingTiers(true);
    setTierError('');
    try {
      const data = await adminGetEventDetail(token, Number(eventId));
      setEventTiers((data.ticket_types || []).map((tt: any) => ({
        id: tt.id,
        name: tt.name,
        tier: tt.tier,
        description: tt.description || '',
        price_naira: tt.price_naira,
        quantity: tt.quantity,
        quantity_sold: tt.quantity_sold,
        is_active: tt.is_active,
        sort_order: tt.sort_order,
      })));
    } catch (e: any) {
      setTierError(e.message || 'Failed to load ticket tiers for event');
    } finally {
      setLoadingTiers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pricing' && selectedEventId) {
      fetchEventTiers(selectedEventId);
    }
  }, [activeTab, selectedEventId]);

  // Pricing Helpers
  const addTierRow = () => {
    setEventTiers(prev => [
      ...prev,
      {
        name: '',
        tier: 'REGULAR',
        description: '',
        price_naira: 0,
        quantity: 100,
        quantity_sold: 0,
        is_active: true,
        sort_order: prev.length,
        isNew: true,
      }
    ]);
  };

  const updateTierField = (idx: number, field: string, val: any) => {
    setEventTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  const removeTier = (idx: number) => {
    const t = eventTiers[idx];
    if (t.quantity_sold > 0) return;
    if (t.isNew) {
      setEventTiers(prev => prev.filter((_, i) => i !== idx));
    } else {
      setEventTiers(prev => prev.map((item, i) => i === idx ? { ...item, toDelete: true } : item));
    }
  };

  const saveAllTiers = async () => {
    if (!selectedEventId) return;
    setSavingTiers(true);
    setTierError('');
    try {
      // 1. Delete marked
      for (const t of eventTiers) {
        if (t.toDelete && t.id) {
          await adminDeleteTicketType(token, t.id);
        }
      }
      // 2. Create / Update
      for (const t of eventTiers.filter(item => !item.toDelete)) {
        const payload = {
          name: t.name,
          tier: t.tier,
          description: t.description,
          price_naira: Number(t.price_naira),
          quantity: Number(t.quantity),
          is_active: t.is_active,
          sort_order: t.sort_order,
        };
        if (t.isNew) {
          await adminCreateTicketType(token, Number(selectedEventId), payload);
        } else if (t.id) {
          await adminUpdateTicketType(token, t.id, payload);
        }
      }
      setTierSuccess(true);
      setTimeout(() => setTierSuccess(false), 2000);
      await fetchEventTiers(selectedEventId);
    } catch (e: any) {
      setTierError(e.message || 'Failed to save ticket types');
    } finally {
      setSavingTiers(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ISSUED' || s === 'ACTIVE') return 'bg-success/15 text-success border-success/30';
    if (s === 'USED') return 'bg-primary/15 text-primary border-primary/30';
    if (s === 'INVALIDATED' || s === 'EXPIRED') return 'bg-destructive/15 text-destructive border-destructive/30';
    return 'bg-warning/15 text-warning border-warning/30';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-primary" /> Tickets & Orders Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search, edit, reassign, or invalidate attendee passes & configure event ticket pricing.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('attendee_tickets')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'attendee_tickets'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="w-4 h-4" /> Attendee Passes & Orders ({total})
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pricing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="w-4 h-4" /> Event Ticket Pricing & Tiers
        </button>
      </div>

      {/* ─── TAB 1: Attendee Tickets ────────────────────────────────────────── */}
      {activeTab === 'attendee_tickets' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 w-full gap-2 items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by ticket code, attendee name, email, order #, or event..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchTickets()}
                />
              </div>

              {/* Event Filter */}
              <select
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-[200px]"
                value={eventFilter}
                onChange={e => setEventFilter(e.target.value)}
              >
                <option value="">All Events</option>
                {eventsList.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>

              <button
                onClick={fetchTickets}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4" /> Filter
              </button>
            </div>

            <button
              onClick={fetchTickets}
              disabled={loading}
              className="p-2 hover:bg-secondary border border-border rounded-xl transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(st => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setTimeout(() => fetchTickets(), 50);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Tickets Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No tickets found matching your query.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Pass Code</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Attendee</th>
                    <th className="px-4 py-3">Tier & Price</th>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                        <a
                          href={`/t/${t.qr_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {t.qr_token.slice(0, 8)}...
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate">
                        {t.event_title}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{t.attendee_name || 'Guest'}</div>
                        <div className="text-xs text-muted-foreground">{t.attendee_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{t.ticket_type_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {t.price_naira === 0 ? 'FREE' : `₦${t.price_naira.toLocaleString('en-NG')}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {t.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditTicket(t)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 border border-primary/20"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: Event Ticket Types & Pricing ────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Event Picker */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Select Event to Manage Tickets & Pricing
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <select
                className="w-full sm:max-w-md px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                {eventsList.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
              <Link
                href={`/admin/events/${selectedEventId}/edit`}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors"
              >
                Open Full Event Editor <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {tierError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {tierError}
            </div>
          )}

          {tierSuccess && (
            <div className="bg-success/10 border border-success/20 text-success text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Ticket tiers saved successfully!
            </div>
          )}

          {/* Tiers List */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Configured Ticket Tiers ({eventTiers.filter(t => !t.toDelete).length})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set prices, inventory, and active status for each ticket tier.
                </p>
              </div>
              <button
                type="button"
                onClick={addTierRow}
                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-primary/20"
              >
                <Plus className="w-4 h-4" /> Add Ticket Tier
              </button>
            </div>

            {loadingTiers ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : eventTiers.filter(t => !t.toDelete).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                No ticket tiers set up for this event yet. Click "Add Ticket Tier" above.
              </div>
            ) : (
              <div className="space-y-4">
                {eventTiers.map((t, idx) => {
                  if (t.toDelete) return null;
                  const hasSales = (t.quantity_sold || 0) > 0;

                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-4 space-y-3 ${
                        t.isNew ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {t.isNew && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">NEW</span>}
                          {hasSales && (
                            <span className="text-[10px] font-bold bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                              {t.quantity_sold} sold
                            </span>
                          )}
                          <span className="text-sm font-bold text-foreground">{t.name || 'Untitled Tier'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateTierField(idx, 'is_active', !t.is_active)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                              t.is_active ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {t.is_active ? 'Active' : 'Inactive'}
                          </button>
                          {hasSales ? (
                            <span className="text-[11px] text-muted-foreground">Cannot delete (has sales)</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeTier(idx)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-xs text-muted-foreground block mb-1">Tier Name</label>
                          <input
                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                            value={t.name}
                            onChange={e => updateTierField(idx, 'name', e.target.value)}
                            placeholder="e.g. VIP Pass"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Type / Category</label>
                          <select
                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={t.tier}
                            onChange={e => updateTierField(idx, 'tier', e.target.value)}
                          >
                            {TIER_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Price in ₦ (Naira)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={t.price_naira}
                            onChange={e => updateTierField(idx, 'price_naira', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Total Capacity {hasSales ? `(min ${t.quantity_sold})` : ''}
                          </label>
                          <input
                            type="number"
                            min={t.quantity_sold || 0}
                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={t.quantity}
                            onChange={e => updateTierField(idx, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={saveAllTiers}
                disabled={savingTiers || loadingTiers}
                className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60 shadow"
              >
                {savingTiers ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Ticket Tiers</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Slide-over Modal */}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          availableTypes={availableTypes}
          token={token}
          onClose={() => setEditingTicket(null)}
          onSaved={() => {
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
