import { getSession } from "@/lib/auth";
import { getAdminEvents } from "@/lib/api/admin";
import { redirect } from "next/navigation";
import AdminPassControl, { type AdminScanEvent } from "./AdminPassControl";

export default async function AdminPassControlPage() {
  const session = await getSession();
  if (!session || !session.accessToken || session.user?.role !== "ADMIN") {
    redirect("/login");
  }

  let events: AdminScanEvent[] = [];
  try {
    const allEvents = await getAdminEvents(session.accessToken);
    events = (Array.isArray(allEvents) ? allEvents : []).map((event: any) => ({
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      status: event.status,
      organizer_name: event.organizer_name,
    }));
  } catch (err) {
    console.error(err);
  }

  // Most useful first: upcoming events, then everything else.
  const now = Date.now();
  events.sort((a, b) => {
    const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
    const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
    const aUpcoming = aTime >= now;
    const bUpcoming = bTime >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });

  return <AdminPassControl events={events} />;
}
