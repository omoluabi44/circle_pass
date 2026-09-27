"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getAdminPayouts, approvePayout, rejectPayout } from "@/lib/api/admin";
import { RefreshCw, Check, X, AlertCircle } from "lucide-react";

export default function AdminPayoutsPage() {
  const { data: session } = useSession();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayouts = async () => {
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      const data = await getAdminPayouts(session.accessToken);
      setPayouts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [session]);

  const handleApprove = async (id: number) => {
    if (!session?.accessToken || !confirm("Are you sure you want to approve this payout?")) return;
    try {
      setActionLoading(true);
      await approvePayout(session.accessToken, id);
      await fetchPayouts();
    } catch (err: any) {
      alert(err.message || "Failed to approve payout");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !selectedPayout) return;
    try {
      setActionLoading(true);
      await rejectPayout(session.accessToken, selectedPayout.id, rejectReason);
      setRejectModalOpen(false);
      setRejectReason("");
      setSelectedPayout(null);
      await fetchPayouts();
    } catch (err: any) {
      alert(err.message || "Failed to reject payout");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (payout: any) => {
    setSelectedPayout(payout);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const filteredPayouts = payouts.filter(p => activeTab === "ALL" || p.status.toUpperCase() === activeTab);

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Payout Approvals</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Note: Approving a payout here marks it as completed. Actual transfer of funds should be handled manually via your bank or Paystack dashboard.
        </p>
      </header>

      {error && (
        <div className="mb-6 bg-red-50 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        {["ALL", "PENDING", "PROCESSING", "COMPLETED", "REJECTED"].map(tab => (
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
        {filteredPayouts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No payouts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Bank Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayouts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.reference}</td>
                    <td className="px-4 py-3">{p.organizer_name || "Unknown"}</td>
                    <td className="px-4 py-3 font-bold text-foreground">₦{(p.amount / 100).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{p.bank_name}</div>
                      <div>{p.account_number}</div>
                      <div className="text-gray-500">{p.account_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        p.status.toUpperCase() === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                        p.status.toUpperCase() === 'REJECTED' || p.status.toUpperCase() === 'FAILED' ? 'bg-red-100 text-red-700' :
                        p.status.toUpperCase() === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status.toUpperCase() === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={actionLoading}
                            className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openRejectModal(p)}
                            disabled={actionLoading}
                            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Reject Payout</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a reason for rejecting the payout for <b>{selectedPayout?.organizer_name}</b> (₦{((selectedPayout?.amount || 0) / 100).toLocaleString()}).
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-24"
                  placeholder="e.g. Invalid bank details"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
