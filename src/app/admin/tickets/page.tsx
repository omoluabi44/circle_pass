import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminTickets } from "@/lib/api/admin";
import AdminTicketsClient from "./AdminTicketsClient";

export default async function AdminTicketsPage() {
  const session = await getSession();
  if (!session || !session.accessToken || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }

  let ticketsData = { tickets: [], total: 0, events: [] };
  try {
    ticketsData = await getAdminTickets(session.accessToken);
  } catch (err) {
    console.error("Failed to load admin tickets:", err);
  }

  return (
    <AdminTicketsClient
      initialTickets={ticketsData.tickets || []}
      initialTotal={ticketsData.total || 0}
      eventsList={ticketsData.events || []}
      token={session.accessToken}
    />
  );
}
