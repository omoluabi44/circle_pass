"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Users, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export default function FollowingPage() {
  const { data: session } = useSession();
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${API}/followed-organizers/`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(r => r.json())
      .then(data => setOrganizers(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Following</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse flex gap-4">
              <div className="w-14 h-14 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : organizers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Not following anyone yet</h3>
          <p className="text-muted-foreground mb-6">Follow organizers to stay updated on their events.</p>
          <Link href="/events" className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Discover Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {organizers.map((item: any) => {
            const org = item.organizer || item;
            return (
              <div key={org.id || item.id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                  {(org.company_name || 'O')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{org.company_name || 'Organizer'}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.follower_count !== undefined && <span>{item.follower_count} followers</span>}
                    {item.upcoming_event_count !== undefined && (
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{item.upcoming_event_count} upcoming</span>
                    )}
                  </div>
                </div>
                <Link href={`/organizers/${org.id}`} className="shrink-0 p-2 text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
