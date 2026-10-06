import { QrCode, Lock, CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getTicketById } from "@/lib/api/tickets";
import { redirect } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session?.accessToken) {
    redirect("/login");
  }

  let ticket = null;
  try {
    ticket = await getTicketById(session.accessToken, id);
  } catch (error) {
    console.error("Failed to fetch ticket:", error);
  }

  if (!ticket) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
        <p className="text-muted-foreground mb-8">The ticket you are looking for does not exist or you do not have permission to view it.</p>
        <Link href="/dashboard/tickets" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium">
          Back to Tickets
        </Link>
      </div>
    );
  }

  const isIssued = ticket.status === "ISSUED";
  const isActive = ticket.status === "ACTIVE";
  const isUsed = ticket.status === "USED";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link href="/dashboard/tickets" className="text-primary hover:underline text-sm mb-4 inline-block">
          &larr; Back to Tickets
        </Link>
        <h1 className="text-3xl font-bold">Digital Pass</h1>
      </header>

      <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col">
        {/* Ticket Header & Image */}
        <div className="relative h-48 bg-primary">
          {ticket.event_image ? (
            <img src={ticket.event_image} alt={ticket.event_title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary/50 font-bold">No Image Available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end">
            <div>
              <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-3">
                {ticket.ticket_type_tier} - {ticket.ticket_type_name}
              </span>
              <h2 className="text-2xl font-extrabold text-white mb-1">{ticket.event_title}</h2>
            </div>
          </div>
        </div>

        {/* Event Details Section */}
        <div className="px-8 py-6 border-b border-border bg-secondary/20 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Date & Time</p>
              <p className="font-semibold text-foreground">{ticket.event_date || "Sat, Oct 10, 2026"} • {ticket.event_time || "10:00 AM"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Venue</p>
              <p className="font-semibold text-foreground">{ticket.event_venue || "Eko Convention Center, Lagos"}</p>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-8 flex flex-col items-center justify-center border-b border-dashed border-border bg-white">
          <div className="relative bg-white p-4 rounded-xl shadow-sm border border-border w-64 h-64 flex items-center justify-center">
            {isUsed ? (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center z-10">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-bold text-foreground text-lg">Checked In</p>
                <p className="text-xs text-muted-foreground mt-1">This ticket has been used.</p>
              </div>
            ) : null}
            
            {/* Render the actual QR Code securely via react-qrcode */}
            <QRCodeSVG 
              value={ticket.qr_token || "invalid"} 
              size={200}
              level="H"
              includeMargin={false}
              className={isUsed ? "opacity-30 filter blur-sm" : ""}
            />
          </div>
          <p className="mt-4 text-sm font-mono text-muted-foreground tracking-widest">{ticket.id.toString().padStart(8, '0')}</p>
        </div>

        {/* Details Section */}
        <div className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Attendee Name</p>
              <p className="font-semibold text-foreground">{ticket.attendee_name || "Guest"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Ticket Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : isIssued ? 'bg-yellow-500' : isUsed ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                <p className="font-semibold text-foreground capitalize">{ticket.status.toLowerCase()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg flex items-start gap-3 mt-2">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Please present this QR code at the entrance. Turn up your screen brightness for faster scanning. 

            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
