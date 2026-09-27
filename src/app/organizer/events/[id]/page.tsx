import { redirect } from "next/navigation";

export default async function EventDetailIndex({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/organizer/events/${resolvedParams.id}/overview`);
}
