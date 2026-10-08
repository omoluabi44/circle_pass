import EventForm from "@/components/events/EventForm";
import { getEventById } from "@/lib/api/events";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const session = await getSession();
  
  if (!session?.accessToken) {
    redirect("/login");
  }

  let eventData = null;
  try {
    eventData = await getEventById(session.accessToken, id);
  } catch (error) {
    console.error("Failed to load event data", error);
    // You could handle the error better here (e.g. show a generic error page)
  }

  if (!eventData) {
    return <div className="p-8 text-center text-muted-foreground">Event not found or failed to load.</div>;
  }

  return <EventForm initialData={eventData} eventId={id} />;
}
