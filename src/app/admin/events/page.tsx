import { getSession } from "@/lib/auth";
import { getAdminEvents } from "@/lib/api/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientEventButtons from "./ClientEventButtons";
// No date-fns needed

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session || !session.accessToken || session.user?.role !== "ADMIN") {
    redirect("/login");
  }

  let events = [];
  try {
    events = await getAdminEvents(session.accessToken);
  } catch (err) {
    console.error(err);
  }

  const params = await searchParams;
  const tab = params.tab || "all";
  let filteredEvents = events;
  if (tab === "pending") {
    filteredEvents = events.filter((e: any) => e.status === "UNDER_REVIEW");
  } else if (tab === "live") {
    filteredEvents = events.filter((e: any) => e.status === "PUBLISHED" || e.status === "LIVE");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Event Management</h1>
          <p className="text-muted-foreground">Manage all events, pending reviews, and publications from this central hub.</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-border pb-2">
        <Link 
          href="/admin/events?tab=all" 
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
        >
          All Events
        </Link>
        <Link 
          href="/admin/events?tab=pending" 
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'pending' ? 'bg-amber-500 text-white' : 'hover:bg-secondary'}`}
        >
          Needs Review
          {events.filter((e: any) => e.status === "UNDER_REVIEW").length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {events.filter((e: any) => e.status === "UNDER_REVIEW").length}
            </span>
          )}
        </Link>
        <Link 
          href="/admin/events?tab=live" 
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'live' ? 'bg-success text-white' : 'hover:bg-secondary'}`}
        >
          Live/Published
        </Link>
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No events found for this filter.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Event Name</th>
                <th className="px-4 py-3">Organizer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((e: any) => (
                <tr key={e.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link href={`/events/${e.slug || e.id}`} target="_blank" className="hover:text-primary hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.organizer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.start_time ? new Date(e.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "TBD"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      (e.status === 'PUBLISHED' || e.status === 'LIVE') ? 'bg-success/10 text-success' : 
                      e.status === 'UNDER_REVIEW' ? 'bg-amber-500/10 text-amber-600' : 
                      e.status === 'REJECTED' ? 'bg-destructive/10 text-destructive' : 
                      'bg-primary/10 text-primary'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end h-full min-h-[3.5rem] gap-2">
                    <Link href={`/events/${e.slug || e.id}`} target="_blank" className="px-3 py-1.5 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                      View
                    </Link>
                    {e.status === 'UNDER_REVIEW' && session.accessToken && (
                      <ClientEventButtons id={e.id} token={session.accessToken} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
