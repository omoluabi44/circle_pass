"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { getEventAttendees } from '@/lib/api/events';
import { useParams } from 'next/navigation';
import { useSession } from "@/context/AuthContext";
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/api/config';

interface Attendee {
  id: number;
  name: string;
  email: string;
  phone: string;
  ticket_type: string;
  purchase_date: string;
  status: string;
  custom_field_responses: Record<string, any>;
}

const BASE_HEADERS = ["Name", "Email", "Phone", "Ticket Type", "Purchase Date", "Status"];

export default function AttendeesPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (status === "loading") return;
      if (!session?.accessToken || !id || id === "undefined") {
        setLoading(false);
        return;
      }
      try {
        const [attendeeData, fieldsRes] = await Promise.all([
          getEventAttendees(session.accessToken as string, id),
          fetch(`${API_URL}/events/${id}/custom-fields/`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }).catch(() => null),
        ]);
        const results = Array.isArray(attendeeData?.results)
          ? attendeeData.results
          : Array.isArray(attendeeData)
          ? attendeeData
          : [];
        setAttendees(results);

        if (fieldsRes && fieldsRes.ok) {
          const fields = await fieldsRes.json();
          setCustomFields(Array.isArray(fields) ? fields : []);
        }
      } catch (err) {
        toast.error("Failed to fetch attendees");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, session?.accessToken, status]);

  const filteredAttendees = attendees.filter((a) =>
    (a.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.phone || "").toLowerCase().includes(search.toLowerCase())
  );

  /**
   * Custom columns: every question configured for the event (in order), then any
   * extra keys that were captured at checkout but no longer exist as a field
   * (e.g. the free-text "Additional Information" box).
   */
  const customColumns = useMemo(() => {
    const ordered: string[] = [];
    customFields.forEach((f) => {
      const label = f.label || String(f.id);
      if (!ordered.includes(label)) ordered.push(label);
    });
    filteredAttendees.forEach((a) => {
      Object.keys(a.custom_field_responses || {}).forEach((key) => {
        if (!ordered.includes(key)) ordered.push(key);
      });
    });
    return ordered;
  }, [customFields, filteredAttendees]);

  const cellValue = (attendee: Attendee, column: string) => {
    const value = attendee.custom_field_responses?.[column];
    if (value === undefined || value === null || value === "") return "-";
    return Array.isArray(value) ? value.join(", ") : String(value);
  };

  const displayStatus = (status: string) => (status === 'USED' ? 'Checked In' : status || 'Unknown');

  const exportRows = () =>
    filteredAttendees.map((a) => [
      a.name || "-",
      a.email || "-",
      a.phone || "-",
      a.ticket_type || "Unknown",
      a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "-",
      displayStatus(a.status),
      ...customColumns.map((column) => cellValue(a, column)),
    ]);

  const exportCSV = () => {
    if (filteredAttendees.length === 0) { toast.error("No data to export"); return; }
    const headers = [...BASE_HEADERS, ...customColumns];
    const rows = exportRows();

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendees_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (filteredAttendees.length === 0) { toast.error("No data to export"); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error("Please allow popups to generate PDF"); return; }
    const headers = [...BASE_HEADERS, ...customColumns];
    const rows = exportRows();
    const htmlContent = `
      <html><head><title>Attendees Export</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}h1{font-size:24px;color:#333}</style>
      </head><body><h1>Event Attendees</h1><table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table><script>window.onload=function(){window.print();window.close()}<\/script></body></html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const totalColumns = BASE_HEADERS.length + customColumns.length;

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-foreground">Attendees</h1>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendees..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button onClick={exportCSV} className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Download className="w-4 h-4 mr-2" />CSV
          </button>
          <button onClick={exportPDF} className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
            <Download className="w-4 h-4 mr-2" />PDF
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                {BASE_HEADERS.map((header) => (
                  <th key={header} className="p-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    {header}
                  </th>
                ))}
                {customColumns.map((column) => (
                  <th key={column} className="p-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={totalColumns} className="p-8 text-center text-muted-foreground">Loading attendees...</td>
                </tr>
              ) : filteredAttendees.length > 0 ? (
                filteredAttendees.map((attendee, idx) => (
                  <tr key={attendee.id ?? idx} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground whitespace-nowrap">{attendee.name || '-'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{attendee.email || '-'}</td>
                    <td className="p-4 text-sm text-foreground whitespace-nowrap">{attendee.phone || '-'}</td>
                    <td className="p-4 text-sm text-foreground">{attendee.ticket_type || 'Unknown'}</td>
                    <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {attendee.purchase_date ? new Date(attendee.purchase_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        attendee.status === 'USED'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {displayStatus(attendee.status)}
                      </span>
                    </td>
                    {customColumns.map((column) => (
                      <td key={column} className="p-4 text-sm text-foreground">
                        {cellValue(attendee, column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={totalColumns} className="p-8 text-center text-muted-foreground">No attendees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
