"use client";

import React, { useState, useEffect, use } from 'react';
import { Send, Clock } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { getEventAnnouncements, createEventAnnouncement } from "@/lib/api/events";

export default function AnnouncementsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const fetchAnnouncements = async () => {
    if (status === "loading") return;
    if (!session?.accessToken || !id || id === "undefined") return;
    try {
      const data = await getEventAnnouncements(session.accessToken as string, id);
      setAnnouncements(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [id, session, status]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    
    setSubmitting(true);
    try {
      await createEventAnnouncement(session?.accessToken as string, id, {
        title,
        message
      });
      toast.success("Announcement sent to attendees");
      setTitle('');
      setMessage('');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to send announcement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading announcements...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Event Announcements</h1>
      
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Send New Announcement</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors" 
              placeholder="e.g. Schedule Update" 
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground min-h-[120px] focus:outline-none focus:border-primary transition-colors" 
              placeholder="Type your message to attendees..."
              required
              disabled={submitting}
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Sending..." : "Send to All Attendees"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Past Announcements</h3>
        
        {announcements.length === 0 && (
          <div className="py-8 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No announcements have been sent yet.
          </div>
        )}

        {announcements.map((ann) => (
          <div key={ann.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-foreground">{ann.title}</h4>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(ann.created_at).toLocaleString()}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {ann.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
