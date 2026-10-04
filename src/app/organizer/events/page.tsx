import { getSession } from "@/lib/auth";
import { getOrganizerEvents, submitEvent } from "@/lib/api/events";
import Link from "next/link";
import { PlusCircle, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  const session = await getSession();
  if (!session || !session.accessToken) {
    redirect('/login');
  }

  let events = [];
  try {
    events = await getOrganizerEvents(session.accessToken);
  } catch (error) {
    console.error("Failed to load events", error);
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PUBLISHED':
      case 'LIVE':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'UNDER_REVIEW':
      case 'SUBMITTED':
        return <Clock className="w-5 h-5 text-warning" />;
      case 'CHANGES_REQUIRED':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-border" />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground capitalize">Events</h1>
          <p className="text-muted-foreground mt-2">Manage your events and track their status.</p>
        </div>
        <Link href="/organizer/events/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary transition flex items-center gap-2 font-medium">
          <PlusCircle className="w-5 h-5" />
          Create Event
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-12 text-center bg-secondary/50 min-h-[400px]">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Events Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You haven't created any events. Click the button above to create your first event.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View: Card Layout */}
          <div className="md:hidden flex flex-col gap-4">
            {events.map((event: any) => (
              <div key={event.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{event.title}</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-1">{event.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-full shrink-0">
                    {getStatusIcon(event.status)}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground font-medium">
                    <span className="block text-foreground">{new Date(event.start_time).toLocaleDateString()}</span>
                    <span>{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <Link 
                    href={`/organizer/events/${event.id}`} 
                    className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    Manage Event
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table Layout */}
          <div className="hidden md:block bg-background rounded-xl shadow-sm border border-border overflow-hidden overflow-y-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-secondary border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Event Details</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Timing</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event: any) => (
                  <tr key={event.id} className="hover:bg-secondary/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">{event.description || 'No description'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.status)}
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {event.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <div>{new Date(event.start_time).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link href={`/organizer/events/${event.id}`} className="text-primary hover:text-primary/80 font-bold bg-primary/10 px-4 py-2 rounded-lg transition-colors inline-block">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
