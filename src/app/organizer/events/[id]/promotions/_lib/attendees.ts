"use client";

import { toast } from "react-hot-toast";
import { API_URL } from "@/lib/api/config";

export type AttendeeRow = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  ticket_type?: string;
  purchase_date?: string;
  status?: string;
  event_title?: string;
  custom_field_responses?: Record<string, any>;
};

const BASE_PDF_HEADERS = ["Name", "Email", "Phone", "Ticket Type", "Purchase Date", "Status"];
const LEGACY_ADDITIONAL_INFO = "Additional Information";

const escapeHtml = (value: unknown) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Attendees whose completed orders used a discount or referral code.
 * The contacts endpoint already filters by event + code, so this is the same
 * data the Attendees page shows.
 */
export async function fetchAttendeesByCode(
  token: string,
  eventId: string,
  code: string,
): Promise<AttendeeRow[]> {
  const res = await fetch(
    `${API_URL}/organizer/contacts/?event_id=${encodeURIComponent(eventId)}&code=${encodeURIComponent(code)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to load attendees");
  const payload = await res.json();
  return Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [];
}

/**
 * Opens the browser print dialog, where "Save as PDF" produces the file.
 * Mirrors the existing attendee export so both lists look identical.
 */
export function printAttendeesPDF({
  code,
  heading,
  rows,
}: {
  code: string;
  heading: string;
  rows: AttendeeRow[];
}) {
  if (rows.length === 0) {
    toast.error(`Nobody has bought with ${code} yet.`);
    return;
  }

  const customColumns: string[] = [];
  rows.forEach((row) => {
    Object.keys(row.custom_field_responses || {}).forEach((key) => {
      if (key !== LEGACY_ADDITIONAL_INFO && !customColumns.includes(key)) {
        customColumns.push(key);
      }
    });
  });

  const headers = [...BASE_PDF_HEADERS, ...customColumns];
  const tableRows = rows.map((row) => [
    row.name || "-",
    row.email || "-",
    row.phone || "-",
    row.ticket_type || "Unknown",
    row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : "-",
    row.status === "USED" ? "Checked In" : (row.status || "Unknown"),
    ...customColumns.map((column) => {
      const value = row.custom_field_responses?.[column];
      if (value === undefined || value === null || value === "") return "-";
      return Array.isArray(value) ? value.join(", ") : String(value);
    }),
  ]);

  const eventTitle = rows[0]?.event_title || "Event";
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to download the PDF");
    return;
  }

  const htmlContent = `
    <html><head><title>${escapeHtml(code)} Attendees</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111}
      h1{font-size:22px;margin:0 0 4px}
      p.sub{color:#555;font-size:13px;margin:0 0 18px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
      th{background:#f2f2f2}
      @media print{body{padding:0}}
    </style>
    </head><body>
    <h1>${escapeHtml(heading)} — Attendees</h1>
    <p class="sub">${escapeHtml(eventTitle)} · ${rows.length} ticket${rows.length === 1 ? '' : 's'}</p>
    <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${tableRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <script>window.onload=function(){window.print();window.close()}<\/script>
    </body></html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export async function copyToClipboard(text: string, message = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Could not copy — please copy it manually.");
  }
}
