"use client";
import { useState, useEffect } from "react";
import { Inbox, Bell, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api/config";

export default function OrganizerInboxPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      const token = (session as any)?.accessToken;
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/organizer/inbox/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setMessages(data.results || data);
        }
      } catch (error) {
        console.error("Failed to fetch inbox", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchInbox();
    }
  }, [session]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
        <p className="text-muted-foreground mt-2">Manage messages from attendees and CirclePass.</p>
      </header>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-secondary/10">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">No messages yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              When attendees ask questions about your events or when we send you important updates, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-6 hover:bg-secondary/50 transition-colors ${!msg.is_read ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary mt-1">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-lg ${!msg.is_read ? 'font-bold' : 'font-semibold'} text-foreground`}>
                        {msg.title}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-secondary text-muted-foreground mb-2">
                      {msg.type}
                    </span>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
