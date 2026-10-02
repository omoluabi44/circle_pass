"use client";

import { LifeBuoy, MessageCircle, ExternalLink, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";
import { toast } from "react-hot-toast";

export default function SupportPage() {
  const { data: session } = useSession();
  const [issueType, setIssueType] = useState("Payout Issue");
  const [relatedEvent, setRelatedEvent] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Fetch events for dropdown
    if (!session?.accessToken) return;
    fetch(`${API_URL}/events/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then(res => res.json())
      .then(data => setEvents(data.results || data))
      .catch(err => console.error(err));
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe your issue.");
      return;
    }
    
    setLoading(true);
    try {
      if (!session?.accessToken) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}/support-tickets/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}` 
        },
        body: JSON.stringify({
          issue_type: issueType,
          related_event: relatedEvent || null,
          description,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit ticket");
      toast.success("Support ticket submitted successfully. We'll get back to you shortly.");
      setDescription("");
      setRelatedEvent("");
      setIssueType("Payout Issue");
    } catch (error) {
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Support & Help Center</h1>
        <p className="text-muted-foreground mt-2">We're here to help you succeed.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all">
          <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">WhatsApp Support</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Get instant help from our dedicated organizer support team. Available Mon-Fri, 9am - 6pm.
          </p>
          <a href="https://wa.me/2348075003645" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#25D366]/90 transition-colors text-sm">
            Chat on WhatsApp <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Browse our comprehensive guides and FAQs for setting up events, scanning tickets, and getting paid.
          </p>
          <Link href="#" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors text-sm">
            Browse Articles <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 mt-8">
        <h3 className="text-xl font-bold text-foreground mb-6">Report an Issue</h3>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Issue Type</label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option>Payout Issue</option>
                <option>Ticket Scanning Problem</option>
                <option>Event Setup</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Related Event (Optional)</label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                value={relatedEvent}
                onChange={(e) => setRelatedEvent(e.target.value)}
              >
                <option value="">Select an event...</option>
                {events.map((event: any) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Description</label>
            <textarea 
              rows={4} 
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Ticket
          </button>
        </form>
      </div>
    </div>
  );
}

function ChevronRightIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
