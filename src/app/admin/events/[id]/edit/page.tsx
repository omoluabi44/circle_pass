import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminGetEventDetail } from "@/lib/api/admin";
import AdminEventEditForm from "./AdminEventEditForm";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getSession();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }

  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.id);

  let data: any = null;
  let error: string | null = null;

  try {
    data = await adminGetEventDetail((session as any).accessToken, eventId);
  } catch (err: any) {
    error = err.message || "Failed to load event";
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/admin/events" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-bold">Error loading event</h2>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin/events" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>
      <AdminEventEditForm
        event={data.event}
        ticketTypes={data.ticket_types}
        allOrganizers={data.all_organizers}
        token={(session as any).accessToken}
      />
    </div>
  );
}
