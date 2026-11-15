"use client";

import React, { useState, useEffect, use } from 'react';
import { Plus, Trash2, FileDown, RefreshCw, PauseCircle, PlayCircle, ChevronDown, Calendar } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { getEventDiscounts, createEventDiscount, updateEventDiscount, deleteEventDiscount, getEventById } from "@/lib/api/events";
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
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [event, setEvent] = useState<any | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("0");
  // Empty = every ticket class
  const [ticketTypeIds, setTicketTypeIds] = useState<number[]>([]);
  const [allowMultiple, setAllowMultiple] = useState("yes");
  const [expiry, setExpiry] = useState("");

  const ticketClasses: any[] = event?.ticket_types || [];

  const resetForm = () => {
    setCode("");
    setType("PERCENTAGE");
    setValue("");
    setUsageLimit("0");
    setTicketTypeIds([]);
    setAllowMultiple("yes");
    setExpiry("");
  };

  const fetchDiscounts = async () => {
    if (status === "loading") return;
    if (!session?.accessToken || !id || id === "undefined") {
      setLoading(false);
      return;
    }
    try {
      setFetchError(null);
      const [data, eventData] = await Promise.all([
        getEventDiscounts(session.accessToken as string, id),
        getEventById(session.accessToken as string, id).catch(() => null),
      ]);
      setDiscounts(
        (Array.isArray(data) ? data : []).filter(
          (d: any) => (d.type || d.discount_type) !== 'REFERRAL'
        )
      );
      if (eventData) setEvent(eventData);
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
    const trimmedCode = code.trim().toUpperCase();
    const numericValue = Number(value);

    if (!trimmedCode) {
      toast.error("Enter a discount code name.");
      return;
    }
    if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
      toast.error("Enter a discount value greater than zero.");
      return;
    }
    if (type === "PERCENTAGE" && numericValue > 95) {
      toast.error("Percentage discount cannot exceed 95%.");
      return;
    }
    if (expiry && Number.isNaN(new Date(expiry).getTime())) {
      toast.error("Enter a valid expiry date and time.");
      return;
    }

    setSubmitting(true);
    try {
      await createEventDiscount(session?.accessToken as string, id, {
        code: trimmedCode,
        type,
        value: type === "FIXED" ? Math.round(numericValue * 100) : Math.round(numericValue),
        usage_limit: usageLimit ? Number(usageLimit) : 0,
        ticket_type_ids: ticketTypeIds,
        allow_multiple_per_user: allowMultiple === "yes",
        valid_until: expiry ? new Date(expiry).toISOString() : null,
      });
      toast.success("Discount created successfully");
      setShowModal(false);
      resetForm();
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (discount: any) => {
    const nextActive = discount.is_active === false;
    setTogglingId(discount.id);
    try {
      const updated = await updateEventDiscount(
        session?.accessToken as string, id, discount.id, { is_active: nextActive }
      );
      setDiscounts(prev =>
        prev.map(d => (d.id === discount.id ? { ...d, is_active: updated.is_active } : d))
      );
      toast.success(nextActive ? "Discount resumed." : "Discount paused.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update discount");
    } finally {
      setTogglingId(null);
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
        <h1 className="text-2xl font-bold text-foreground">Discount Codes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Discount Code
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
        {discounts.map((discount) => {
          const isActive = discount.is_active !== false;
          const classes = (discount.ticket_type_ids || [])
            .map((tid: number) => ticketClasses.find((t: any) => t.id === tid)?.name)
            .filter(Boolean);
          return (
          <div key={discount.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4 gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">{discount.code}</h3>
                <p className="text-sm text-muted-foreground">
                  {(discount.type || discount.discount_type) === 'PERCENTAGE'
                    ? `${discount.value}% Off`
                    : `₦${(discount.value / 100).toLocaleString()} Off`}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${isActive ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                {isActive ? 'Active' : 'Paused'}
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
              <div className="flex justify-between text-sm gap-3">
                <span className="text-muted-foreground flex-shrink-0">Applies to</span>
                <span className="font-medium text-foreground text-right truncate">
                  {classes.length > 0 ? classes.join(', ') : 'All ticket classes'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Per person</span>
                <span className="font-medium text-foreground">
                  {discount.allow_multiple_per_user === false ? 'Once only' : 'Multiple uses'}
                </span>
              </div>
              {discount.valid_until && (
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-muted-foreground flex-shrink-0">Expires</span>
                  <span className="font-medium text-foreground text-right">
                    {new Date(discount.valid_until).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => handleToggleActive(discount)}
                  disabled={togglingId === discount.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                    isActive
                      ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20'
                      : 'text-success bg-success/10 hover:bg-success/20'
                  }`}
                  title={isActive ? `Pause ${discount.code}` : `Resume ${discount.code}`}
                >
                  {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  {togglingId === discount.id ? "Saving..." : isActive ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => downloadAttendeesPDF(discount)}
                  disabled={downloadingId === discount.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50"
                  title={`Download the attendees who used ${discount.code} as a PDF`}
                >
                  <FileDown className="w-4 h-4" />
                  {downloadingId === discount.id ? "Preparing..." : "Attendees PDF"}
                </button>
              </div>
              <button 
                onClick={() => handleDelete(discount.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex-shrink-0"
                title="Delete code"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-lg p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Create Discount Code</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Discount Code Name</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. SUMMER50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Discount Type</label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Amount</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {type === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₦)"}
                </label>
                <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                  <span className="flex items-center px-3 text-sm font-semibold text-foreground bg-secondary border-r border-border">
                    {type === "PERCENTAGE" ? "%" : "₦"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none"
                    placeholder={type === "PERCENTAGE" ? "20" : "5000"}
                  />
                </div>
                {type === "PERCENTAGE" && (
                  <p className="mt-1 text-xs text-muted-foreground">Maximum 95%.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  What ticket classes does this apply to?
                </label>
                <div className="space-y-1.5 rounded-xl border border-border bg-background p-2">
                  <label className={`flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${ticketTypeIds.length === 0 ? 'bg-primary/10' : 'hover:bg-secondary'}`}>
                    <input
                      type="checkbox"
                      checked={ticketTypeIds.length === 0}
                      onChange={() => setTicketTypeIds([])}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span className="text-sm font-medium text-foreground">All Ticket Classes</span>
                  </label>
                  {ticketClasses.map((cls: any) => (
                    <label key={cls.id} className={`flex items-center gap-3 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${ticketTypeIds.includes(cls.id) ? 'bg-primary/10' : 'hover:bg-secondary'}`}>
                      <input
                        type="checkbox"
                        checked={ticketTypeIds.includes(cls.id)}
                        onChange={() => {
                          setTicketTypeIds(prev =>
                            prev.includes(cls.id)
                              ? prev.filter(t => t !== cls.id)
                              : [...prev, cls.id]
                          );
                        }}
                        className="w-4 h-4 accent-primary rounded"
                      />
                      <span className="text-sm text-foreground">{cls.name}</span>
                    </label>
                  ))}
                  {ticketClasses.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      No ticket classes created for this event yet.
                    </p>
                  )}
                </div>
                {ticketTypeIds.length === 0 && ticketClasses.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies to every ticket class. Tick a class to limit the code.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Max Usage Count (0 for unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Enable Multiple Usage Per User
                </label>
                <div className="relative">
                  <select
                    value={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Expiry Date &amp; Time
                </label>
                <div className="flex items-stretch rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                  <span className="flex items-center px-3 bg-secondary border-r border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <input
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Leave empty for no expiry.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
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
