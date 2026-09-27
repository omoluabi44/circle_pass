"use client";

import React, { useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [absorbFees, setAbsorbFees] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Event Settings</h1>
        <button className="bg-primary text-primary-foreground px-5 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">General Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Event Title</label>
              <input type="text" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground" defaultValue="Lagos Tech Fest 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px]" defaultValue="The biggest tech conference in West Africa."></textarea>
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
              value={isPublished ? "PUBLISHED" : "DRAFT"} 
              onChange={(e) => setIsPublished(e.target.value === "PUBLISHED")}
              className="bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-medium"
            >
              <option value="PUBLISHED">Published (Public)</option>
              <option value="DRAFT">Draft (Hidden)</option>
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
          <button className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
            Cancel Event
          </button>
        </div>
      </div>
    </div>
  );
}
