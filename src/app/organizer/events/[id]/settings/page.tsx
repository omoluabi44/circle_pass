"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Save, AlertTriangle, Loader2, Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from "@/context/AuthContext";
import { getEventById, updateEvent } from '@/lib/api/events';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/api/config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomField {
  id?: number;
  label: string;
  field_type: 'text' | 'number' | 'select';
  options: string[];
  required: boolean;
  position: number;
  _isNew?: boolean;
  _tempId?: string;
}

// ── Custom Field Row ──────────────────────────────────────────────────────────

function FieldRow({
  field,
  onUpdate,
  onDelete,
  saving,
}: {
  field: CustomField;
  onUpdate: (f: Partial<CustomField>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [optionsText, setOptionsText] = useState((field.options || []).join('\n'));

  function handleOptionsBlur() {
    const opts = optionsText.split('\n').map(o => o.trim()).filter(Boolean);
    onUpdate({ options: opts });
  }

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-start">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Field Label</label>
            <input
              type="text"
              value={field.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="e.g. School Name"
              disabled={saving}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
            <div className="relative">
              <select
                value={field.field_type}
                onChange={e => onUpdate({ field_type: e.target.value as any, options: [] })}
                disabled={saving}
                className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors pr-8"
              >
                <option value="text">Short Text</option>
                <option value="number">Number</option>
                <option value="select">Dropdown</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Required toggle */}
          <div className="pt-5 flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={field.required}
                onChange={() => onUpdate({ required: !field.required })}
                disabled={saving}
              />
              <div className="w-8 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative" />
            </label>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Required</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown options */}
      {field.field_type === 'select' && (
        <div className="ml-7">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Options <span className="font-normal text-muted-foreground/60">(one per line)</span>
          </label>
          <textarea
            rows={3}
            value={optionsText}
            onChange={e => setOptionsText(e.target.value)}
            onBlur={handleOptionsBlur}
            placeholder={"University of Lagos\nUniversity of Ibadan\nOthers"}
            disabled={saving}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldsSaving, setFieldsSaving] = useState(false);

  // General settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [absorbFees, setAbsorbFees] = useState(false);
  const [eventStatus, setEventStatus] = useState("DRAFT");

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchEventSettings() {
      if (authStatus === 'loading') return;
      if (!session?.accessToken || !id || id === 'undefined') return;
      try {
        const data = await getEventById(session.accessToken as string, id);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAbsorbFees(data.absorb_fees || false);
        setEventStatus(data.status || "DRAFT");
      } catch (err) {
        toast.error("Failed to load event settings.");
      } finally {
        setLoading(false);
      }
    }
    fetchEventSettings();
  }, [id, session?.accessToken, authStatus]);

  const fetchCustomFields = useCallback(async () => {
    if (!session?.accessToken || !id || id === 'undefined') return;
    setFieldsLoading(true);
    try {
      const res = await fetch(`${API_URL}/events/${id}/custom-fields/`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomFields(data);
    } catch {
      // Fields endpoint might not exist yet on first deploy — fail silently
      setCustomFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, [session?.accessToken, id]);

  useEffect(() => {
    fetchCustomFields();
  }, [fetchCustomFields]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!session?.accessToken) return;
    setSaving(true);
    try {
      await updateEvent(session.accessToken as string, id, {
        title,
        description,
        absorb_fees: absorbFees,
        status: eventStatus,
      });
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!confirm("Are you sure you want to cancel this event? This action cannot be undone.")) return;
    if (!session?.accessToken) return;
    try {
      await updateEvent(session.accessToken as string, id, { status: 'ARCHIVED' });
      setEventStatus('ARCHIVED');
      toast.success("Event cancelled successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel event.");
    }
  };

  function addField() {
    setCustomFields(prev => [
      ...prev,
      {
        label: '',
        field_type: 'text',
        options: [],
        required: false,
        position: prev.length,
        _isNew: true,
        _tempId: Math.random().toString(36).slice(2),
      },
    ]);
  }

  function updateField(index: number, patch: Partial<CustomField>) {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f));
  }

  async function deleteField(index: number) {
    const field = customFields[index];
    if (field._isNew) {
      setCustomFields(prev => prev.filter((_, i) => i !== index));
      return;
    }
    if (!field.id || !session?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/events/${id}/custom-fields/${field.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok && res.status !== 204) throw new Error();
      setCustomFields(prev => prev.filter((_, i) => i !== index));
      toast.success("Field removed.");
    } catch {
      toast.error("Failed to remove field.");
    }
  }

  async function saveCustomFields() {
    if (!session?.accessToken) return;
    setFieldsSaving(true);

    try {
      for (let i = 0; i < customFields.length; i++) {
        const field = customFields[i];
        if (!field.label.trim()) {
          toast.error(`Field #${i + 1} needs a label.`);
          setFieldsSaving(false);
          return;
        }

        if (field._isNew) {
          // Create new field
          const res = await fetch(`${API_URL}/events/${id}/custom-fields/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              label: field.label,
              field_type: field.field_type,
              options: field.options,
              required: field.required,
              position: i,
            }),
          });
          if (!res.ok) throw new Error(`Failed to create field "${field.label}"`);
        } else if (field.id) {
          // Update existing field
          const res = await fetch(`${API_URL}/events/${id}/custom-fields/${field.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              label: field.label,
              field_type: field.field_type,
              options: field.options,
              required: field.required,
              position: i,
            }),
          });
          if (!res.ok) throw new Error(`Failed to update field "${field.label}"`);
        }
      }

      toast.success("Custom fields saved!");
      await fetchCustomFields(); // Reload to get server IDs
    } catch (err: any) {
      toast.error(err.message || "Failed to save custom fields.");
    } finally {
      setFieldsSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Event Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">General Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Event Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Event Title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px] focus:outline-none focus:border-primary transition-colors"
                placeholder="Describe your event..."
              />
            </div>
          </div>
        </div>

        {/* ── Custom Checkout Fields ── */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Custom Checkout Fields</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ask attendees extra questions at checkout — e.g. School Name, Student ID, Dietary preference.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {fieldsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading fields…
              </div>
            ) : customFields.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No custom fields yet. Add one below.
              </p>
            ) : (
              customFields.map((field, index) => (
                <FieldRow
                  key={field.id ?? field._tempId}
                  field={field}
                  onUpdate={(patch) => updateField(index, patch)}
                  onDelete={() => deleteField(index)}
                  saving={fieldsSaving}
                />
              ))
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={addField}
              disabled={fieldsSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-primary/50 text-primary text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>

            {customFields.length > 0 && (
              <button
                type="button"
                onClick={saveCustomFields}
                disabled={fieldsSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {fieldsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {fieldsSaving ? "Saving…" : "Save Fields"}
              </button>
            )}
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Financial &amp; Fees</h2>
          <div className="flex items-start justify-between bg-secondary/50 p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-medium text-foreground">Absorb CirclePass Fees</h3>
              <p className="text-sm text-muted-foreground mt-1">If enabled, you will pay the 5% ticketing fee instead of the attendee.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input type="checkbox" className="sr-only peer" checked={absorbFees} onChange={() => setAbsorbFees(!absorbFees)} />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Status</h2>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-foreground">Published Status</h3>
              <p className="text-sm text-muted-foreground mt-1">Control whether your event is visible to the public.</p>
            </div>
            <select
              value={eventStatus}
              onChange={(e) => setEventStatus(e.target.value)}
              className="bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-medium focus:outline-none focus:border-primary transition-colors"
            >
              <option value="DRAFT">Draft (Hidden)</option>
              <option value="SUBMITTED">Submitted for Review</option>
              <option value="PUBLISHED">Published (Public)</option>
              <option value="ARCHIVED">Archived (Hidden/Cancelled)</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card border border-destructive/20 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Canceling your event will immediately stop all ticket sales and notify all current ticketholders. This action cannot be undone.
          </p>
          <button
            onClick={handleCancelEvent}
            className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel Event
          </button>
        </div>
      </div>
    </div>
  );
}
