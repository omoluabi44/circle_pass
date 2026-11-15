"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  AttendeeRow, fetchAttendeesByCode, printAttendeesPDF,
} from "../_lib/attendees";

type Props = {
  token?: string;
  eventId: string;
  code: string;
  heading: string;
};

/** Attendees attributed to one discount or referral code, with PDF export. */
export default function AttendeeList({ token, eventId, code, heading }: Props) {
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAttendeesByCode(token, eventId, code));
    } catch (err: any) {
      setError(err.message || "Could not load attendees");
    } finally {
      setLoading(false);
    }
  }, [token, eventId, code]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            Attendees
            {!loading && !error && (
              <span className="ml-2 text-xs font-medium text-muted-foreground">
                {rows.length}
              </span>
            )}
          </h2>
        </div>
        <button
          onClick={() => {
            try {
              printAttendeesPDF({ code, heading, rows });
            } catch (err: any) {
              toast.error(err.message || "Could not download attendees");
            }
          }}
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download Attendees PDF
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading attendees...</p>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-destructive">{error}</span>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tickets have been sold with this code yet. Sales appear here once
          the purchase completes.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 px-2 font-semibold">Name</th>
                <th className="py-2 px-2 font-semibold">Email</th>
                <th className="py-2 px-2 font-semibold">Phone</th>
                <th className="py-2 px-2 font-semibold">Ticket</th>
                <th className="py-2 px-2 font-semibold">Purchased</th>
                <th className="py-2 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-2.5 px-2 text-foreground">{row.name || "-"}</td>
                  <td className="py-2.5 px-2 text-muted-foreground break-all">
                    {row.email || "-"}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">{row.phone || "-"}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">
                    {row.ticket_type || "-"}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                    {row.purchase_date
                      ? new Date(row.purchase_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === "USED"
                          ? "bg-success/10 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {row.status === "USED" ? "Checked In" : "Not checked in"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
