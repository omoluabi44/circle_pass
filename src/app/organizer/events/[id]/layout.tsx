import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EventManageNav from "./EventManageNav";

export default async function EventManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  return (
    <div className="flex flex-col min-h-screen bg-secondary/20">
      {/* Top Navigation for Event Management */}
      <div className="bg-background border-b border-border sticky top-0 z-30">
        <div className="px-4 md:px-8 py-4 flex items-center gap-4">
          <Link 
            href="/organizer/events"
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Manage Event</h1>
            <p className="text-xs text-muted-foreground">Event Dashboard</p>
          </div>
        </div>
        
        {/* Scrollable Tabs - Client Component for active state tracking */}
        <EventManageNav eventId={id} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
