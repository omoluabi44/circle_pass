"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, AlertCircle, ChevronRight, X } from "lucide-react";
import { API_URL as API } from "@/lib/api/config";

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "bg-blue-100 text-blue-700",
  SUCCESSFUL: "bg-green-100 text-green-700",
  FAILED:     "bg-red-100 text-red-700",
  REVERSED:   "bg-orange-100 text-orange-700",
};

const formatCurrency = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export default function AdminPayoutsPage() {
  const { data: session } = useSession();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedPayout, setSelectedPayout] = useState<any>(null);

  const fetchPayouts = async () => {
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      setError("");
      const qs = activeTab !== "ALL" ? `?status=${activeTab}` : "";
      const res = await fetch(`${API}/admin/payouts/${qs}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load payouts");
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : data.results ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, [session, activeTab]);

  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto flex justify-center">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Payout Monitor</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Payouts are auto-initiated via Paystack Transfers. Status is driven by Paystack webhooks.
        </p>
      </header>

      {error && (
        <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />{error}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        {["ALL", "PROCESSING", "SUCCESSFUL", "FAILED", "REVERSED"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
        {payouts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No payouts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3">Deducted</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p: any) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPayout(p)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{p.reference}</td>
                    <td className="px-4 py-3">{p.organizer_name || "—"}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-orange-600">{formatCurrency(p.payout_charge || 0)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(p.amount_received || 0)}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{p.bank_name}</div>
                      <div className="text-gray-500">{p.account_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[p.status?.toUpperCase()] ?? "bg-gray-100 text-gray-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Payout Detail</h3>
              <button onClick={() => setSelectedPayout(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm overflow-y-auto">
              <div className="flex justify-center mb-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${STATUS_COLORS[selectedPayout.status?.toUpperCase()] ?? "bg-gray-100 text-gray-700"}`}>
                  {selectedPayout.status}
                </span>
              </div>
              {[
                ["Reference",       selectedPayout.reference],
                ["Organizer",       selectedPayout.organizer_name],
                ["Email",           selectedPayout.organizer_email],
                ["Amount Deducted", formatCurrency(selectedPayout.amount)],
                ["Payout Charge",   formatCurrency(selectedPayout.payout_charge || 0)],
                ["Amount Received", formatCurrency(selectedPayout.amount_received || 0)],
                ["Bank",            selectedPayout.bank_name],
                ["Account",         selectedPayout.account_number],
                ["Account Name",    selectedPayout.account_name],
                ["Transfer Code",   selectedPayout.paystack_transfer_code || "—"],
                ["Requested",       new Date(selectedPayout.requested_at).toLocaleString()],
                ...(selectedPayout.processed_at
                  ? [["Processed", new Date(selectedPayout.processed_at).toLocaleString()]]
                  : []),
                ...(selectedPayout.failure_reason
                  ? [["Failure Reason", selectedPayout.failure_reason]]
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500 shrink-0">{k}</span>
                  <span className="font-medium text-right break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
