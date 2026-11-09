"use client";

import React, { useState, useEffect, use } from 'react';
import { Plus, Trash2, FileDown } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { getEventDiscounts, createEventDiscount, deleteEventDiscount } from "@/lib/api/events";
import { API_URL } from "@/lib/api/config";

const BASE_PDF_HEADERS = ["Name", "Email", "Phone", "Ticket Type", "Purchase Date", "Status"];
const LEGACY_ADDITIONAL_INFO = "Additional Information";

const escapeHtml = (value: unknown) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default function DiscountsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("0");

  const fetchDiscounts = async () => {
    if (status === "loading") return;
    if (!session?.accessToken || !id || id === "undefined") {
      setLoading(false);
      return;
    }
    try {
      setFetchError(null);
      const data = await getEventDiscounts(session.accessToken as string, id);
      setDiscounts(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch discounts");
      setFetchError(err.message || "Failed to fetch discounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [id, session?.accessToken, status]);

  const handleCreate = async () => {
    if (!code || !value) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createEventDiscount(session?.accessToken as string, id, {
        code,
        type,
        value: type === "FIXED" ? Math.round(Number(value) * 100) : Number(value),
        usage_limit: usageLimit ? Number(usageLimit) : 0
      });
      toast.success("Discount created successfully");
      setShowModal(false);
      setCode("");
      setValue("");
      setUsageLimit("0");
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (discountId: string | number) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    try {
      await deleteEventDiscount(session?.accessToken as string, id, discountId);
      toast.success("Discount deleted");
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete discount");
    }
  };

  /**
   * Downloads the attendees who bought with this exact code as a PDF.
   * Opens the browser print dialog, where "Save as PDF" produces the file.
   */
  const downloadAttendeesPDF = async (discount: any) => {
    if (!session?.accessToken) {
      toast.error("Please sign in again to download attendees.");
      return;
    }
    setDownloadingId(discount.id);
    try {
      const res = await fetch(
        `${API_URL}/organizer/contacts/?event_id=${encodeURIComponent(id)}&code=${encodeURIComponent(discount.code)}`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error("Failed to load attendees");
      const payload = await res.json();
      const results: any[] = Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : [];

      if (results.length === 0) {
        toast.error(`Nobody has bought with ${discount.code} yet.`);
        return;
      }

      const customColumns: string[] = [];
      results.forEach((row) => {
        Object.keys(row.custom_field_responses || {}).forEach((key) => {
          if (key !== LEGACY_ADDITIONAL_INFO && !customColumns.includes(key)) {
            customColumns.push(key);
          }
        });
      });

      const headers = [...BASE_PDF_HEADERS, ...customColumns];
      const rows = results.map((row) => [
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

      const eventTitle = results[0]?.event_title || "Event";
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to download the PDF");
        return;
      }

      const htmlContent = `
        <html><head><title>${escapeHtml(discount.code)} Attendees</title>
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
        <h1>${escapeHtml(discount.code)} — Attendees</h1>
        <p class="sub">${escapeHtml(eventTitle)} · ${results.length} ticket${results.length === 1 ? '' : 's'}</p>
        <table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
        <script>window.onload=function(){window.print();window.close()}<\/script>
        </body></html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err: any) {
      toast.error(err.message || "Could not download attendees");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading discounts...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Discounts & Referrals</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Code
        </button>
      </div>

      {fetchError && discounts.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between">
          <p className="text-sm font-medium">{fetchError}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchDiscounts();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No codes created yet.
          </div>
        )}
        {discounts.map((discount) => (
          <div key={discount.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{discount.code}</h3>
                <p className="text-sm text-muted-foreground">
                  {(discount.type || discount.discount_type) === 'REFERRAL' ? 'Referral Tracker' :
                   (discount.type || discount.discount_type) === 'PERCENTAGE' ? `${discount.value}% Off` : `₦${(discount.value / 100).toLocaleString()} Off`}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${discount.is_active !== false ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                {discount.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium text-foreground">
                  {discount.usage_count ?? discount.times_used ?? 0} / {discount.usage_limit ? discount.usage_limit : '∞'}
                </span>
              </div>
              {discount.usage_limit > 0 && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (((discount.usage_count ?? discount.times_used ?? 0)) / discount.usage_limit) * 100)}%` }}></div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
              <button
                onClick={() => downloadAttendeesPDF(discount)}
                disabled={downloadingId === discount.id}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50"
                title={`Download the attendees who used ${discount.code} as a PDF`}
              >
                <FileDown className="w-4 h-4" />
                {downloadingId === discount.id ? "Preparing..." : "Attendees PDF"}
              </button>
              <button 
                onClick={() => handleDelete(discount.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                title="Delete code"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Create Code</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground uppercase" 
                  placeholder="e.g. SUMMER50 or JOHN2026" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                  <select 
                    value={type}
                    onChange={(e) => { setType(e.target.value); if(e.target.value === 'REFERRAL') setValue('0'); }}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    {type === "REFERRAL" ? "Value (0 = Tracking Only)" : "Value"}
                  </label>
                  <input 
                    type="number" 
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={type === "REFERRAL" && value === "0" ? false : false} // Just a visual cue, they can still give a discount on referral if they want
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground" 
                    placeholder={type === "PERCENTAGE" ? "20" : "5000"} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Usage Limit (0 for unlimited)</label>
                <input 
                  type="number" 
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground" 
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowModal(false)} 
                disabled={submitting}
                className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
