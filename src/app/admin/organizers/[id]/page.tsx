import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminOrganizerDetail } from "@/lib/api/admin";
import Link from "next/link";
import {
  ArrowLeft, Building2, User, Globe, AtSign, Mail, Phone, Calendar,
  Ticket, Wallet, Banknote, CheckCircle, Clock, ExternalLink, ShieldCheck,
  BarChart3, Users, AlertCircle, Pencil
} from "lucide-react";
import EditOrganizerButton from "./EditOrganizerButton";
import TransferOrganizerEventButton from "./TransferOrganizerEventButton";

export default async function AdminOrganizerDashboardPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getSession();

  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  const resolvedParams = await params;
  const organizerIdOrUserId = resolvedParams.id;

  let detail: any = null;
  let error: string | null = null;

  try {
    detail = await getAdminOrganizerDetail((session as any).accessToken, organizerIdOrUserId);
  } catch (err: any) {
    error = err.message || "Failed to load organizer dashboard data.";
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Organizers & Users
          </Link>
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl space-y-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Error Loading Organizer
            </h1>
            <p className="text-sm">{error || "Organizer profile not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const { organizer, wallet, summary, events, recent_orders } = detail;
  const checkinRate = summary.total_tickets_sold > 0
    ? Math.round((summary.total_tickets_used / summary.total_tickets_sold) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Organizers & Users
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {organizer.company_name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${organizer.verification_status === "VERIFIED" || organizer.verification_status === "Verified"
                    ? "bg-success/10 text-success"
                    : organizer.verification_status === "REJECTED" || organizer.verification_status === "Rejected"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning"
                    }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {organizer.verification_status || "Unverified"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  {organizer.first_name || organizer.last_name
                    ? `${organizer.first_name} ${organizer.last_name}`.trim()
                    : organizer.username}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary" />
                  {organizer.email}
                </span>
                {organizer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-primary" />
                    {organizer.phone}
                  </span>
                )}
                {organizer.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Joined {new Date(organizer.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {organizer.bio && (
                <p className="text-sm text-muted-foreground pt-1 italic">
                  &ldquo;{organizer.bio}&rdquo;
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <EditOrganizerButton organizer={organizer} token={(session as any).accessToken} />
              {organizer.website && (
                <a
                  href={organizer.website.startsWith("http") ? organizer.website : `https://${organizer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors border border-border"
                >
                  <Globe className="w-3.5 h-3.5" /> Website
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              )}
              {organizer.instagram_handle && (
                <a
                  href={`https://instagram.com/${organizer.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors border border-border"
                >
                  <AtSign className="w-3.5 h-3.5" /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* High-Level Financial & Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Available Wallet Balance</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ₦{((wallet.available_balance || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              Pending: ₦{((wallet.pending_balance || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Net Revenue</span>
              <Banknote className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ₦{(((summary.total_revenue ?? wallet.total_earnings) || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              Across {summary.total_events} registered event{summary.total_events === 1 ? "" : "s"}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Tickets Sold</span>
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {summary.total_tickets_sold.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Checked In: {summary.total_tickets_used.toLocaleString()} ({checkinRate}%)
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active Events</span>
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {summary.active_events} <span className="text-sm font-normal text-muted-foreground">/ {summary.total_events} total</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Status: Published & Live
            </div>
          </div>
        </div>

        {/* Bank & Payout Details */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Payout & Settlement Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Bank Name</span>
              <span className="font-semibold text-foreground">{wallet.bank_name || "Not provided"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Account Number</span>
              <span className="font-semibold text-foreground">{wallet.account_number || "Not provided"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Account Name</span>
              <span className="font-semibold text-foreground">{wallet.account_name || "Not provided"}</span>
            </div>
          </div>
          {wallet.total_withdrawn > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              Total Withdrawn to Date: <span className="font-semibold text-foreground">₦{((wallet.total_withdrawn || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {/* All Events Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Organizer Events ({events.length})
            </h2>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                This organizer has not created any events yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((evt: any) => {
                  const capacityPercent = evt.capacity && evt.capacity > 0
                    ? Math.min(100, Math.round((evt.tickets_sold / evt.capacity) * 100))
                    : 0;

                  return (
                    <div key={evt.id} className="p-5 hover:bg-secondary/40 transition-colors space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="font-bold text-lg text-foreground">{evt.title}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${evt.status === "PUBLISHED" || evt.status === "LIVE"
                                ? "bg-success/15 text-success"
                                : evt.status === "DRAFT"
                                  ? "bg-muted text-muted-foreground"
                                  : evt.status === "REJECTED"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-warning/15 text-warning"
                                }`}
                            >
                              {evt.status}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                              {evt.event_type}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            {evt.start_time && (
                              <span>
                                {new Date(evt.start_time).toLocaleDateString("en-NG", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {evt.venue_name && <span>• {evt.venue_name}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/events/${evt.slug}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 border border-border"
                          >
                            <span>Public Page</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </Link>
                          <Link
                            href={`/admin/events/${evt.id}/edit`}
                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </Link>
                          <TransferOrganizerEventButton
                            eventId={evt.id}
                            eventTitle={evt.title}
                            currentOrganizerName={organizer.company_name}
                            token={(session as any).accessToken}
                          />
                        </div>
                      </div>

                      {/* Sales & Financial Bar for this Event */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-background border border-border/80 rounded-lg p-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Net Revenue</span>
                          <span className="font-bold text-sm text-foreground">
                            ₦{((evt.net_revenue || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Tickets Sold</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-sm text-foreground">
                              {evt.tickets_sold}
                              {evt.capacity ? ` / ${evt.capacity}` : ""}
                            </span>
                            {evt.capacity && evt.capacity > 0 && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                ({capacityPercent}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Check-in Progress</span>
                          <span className="font-bold text-sm text-foreground">
                            {evt.tickets_used} Checked In
                            {evt.tickets_sold > 0 && (
                              <span className="text-[10px] text-muted-foreground font-medium ml-1">
                                ({Math.round((evt.tickets_used / evt.tickets_sold) * 100)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Tiers Breakdown */}
                      {evt.ticket_tiers && evt.ticket_tiers.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                            Ticket Tiers ({evt.ticket_tiers.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {evt.ticket_tiers.map((tier: any) => (
                              <div
                                key={tier.id}
                                className="bg-secondary/40 border border-border/50 rounded-lg p-2.5 text-xs flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-semibold text-foreground">{tier.name}</div>
                                  <div className="text-muted-foreground text-[11px]">
                                    ₦{((tier.price || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-foreground">
                                    {tier.quantity_sold} / {tier.quantity}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">sold</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Recent Orders Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Recent Orders ({recent_orders.length})
          </h2>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            {recent_orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No orders recorded yet for this organizer.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Attendee</th>
                    <th className="px-4 py-3">Tickets</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent_orders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs text-foreground">
                        {ord.order_number || `#${ord.id}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                        {ord.event_title}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{ord.attendee_name}</div>
                        <div className="text-xs text-muted-foreground">{ord.attendee_email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {ord.ticket_count}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        ₦{((ord.total_amount || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ord.status === "PAID" || ord.status === "COMPLETED"
                            ? "bg-success/10 text-success"
                            : ord.status === "FAILED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                            }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
