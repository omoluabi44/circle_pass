"use client";

import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getEventById, updateEvent } from '@/lib/api/events';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [absorbFees, setAbsorbFees] = useState(false);
  const [eventStatus, setEventStatus] = useState("DRAFT");

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
  }, [id, session, authStatus]);

  const handleSave = async () => {
    if (!session?.accessToken) return;
    setSaving(true);
    try {
      const dataToUpdate = {
        title,
        description,
        absorb_fees: absorbFees,
        status: eventStatus
      };
      await updateEvent(session.accessToken as string, id, dataToUpdate);
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
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground" 
                placeholder="Event Title" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px]" 
                placeholder="Describe your event..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Financial & Fees</h2>
          <div className="flex items-start justify-between bg-secondary/50 p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-medium text-foreground">Absorb CirclePass Fees</h3>
              <p className="text-sm text-muted-foreground mt-1">If enabled, you will pay the 5% ticketing fee instead of the attendee.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input type="checkbox" className="sr-only peer" checked={absorbFees} onChange={() => setAbsorbFees(!absorbFees)} />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
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
              className="bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-medium"
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
