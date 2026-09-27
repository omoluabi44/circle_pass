"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Clock, CheckCircle2, Wallet, RefreshCw, X, AlertCircle } from "lucide-react";
import { getOrganizerWallet, getPayoutHistory, requestPayout } from "@/lib/api/wallet";

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '999992', name: 'Opay' },
  { code: '999991', name: 'PalmPay' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '90267', name: 'Moniepoint' },
];

export default function FinanceDashboard() {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState("");

  const fetchData = async () => {
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      setError("");
      const [walletData, historyData] = await Promise.all([
        getOrganizerWallet(session.accessToken),
        getPayoutHistory(session.accessToken)
      ]);
      setWallet(walletData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;
    try {
      setPayoutLoading(true);
      setPayoutError("");
      
      const amountKobo = Math.round(parseFloat(payoutAmount) * 100);
      
      await requestPayout(session.accessToken, {
        amount: amountKobo,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        bank_name: "Selected Bank"
      });
      
      setIsModalOpen(false);
      setPayoutAmount("");
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
      
      await fetchData();
    } catch (err: any) {
      setPayoutError(err.message || "Failed to request payout");
    } finally {
      setPayoutLoading(false);
    }
  };

  const formatCurrency = (kobo: number) => {
    return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return (
          <span className="flex w-fit items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="flex w-fit items-center gap-1.5 bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-500/20">
            <RefreshCw className="w-3 h-3" />
            Processing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex w-fit items-center gap-1.5 bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full text-xs font-bold border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'FAILED':
      case 'REJECTED':
        return (
          <span className="flex w-fit items-center gap-1.5 bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-xs font-bold border border-red-500/20">
            <X className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="flex w-fit items-center gap-1.5 bg-gray-500/10 text-gray-500 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto relative">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your wallet and request payouts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Wallet className="w-5 h-5" />
          Request Payout
        </button>
      </header>

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-background border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="w-16 h-16 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-2">Available Balance</p>
            <h2 className="text-3xl font-bold text-foreground mb-2">{formatCurrency(wallet.available_balance || 0)}</h2>
            <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
              <span>Ready for withdrawal</span>
            </div>
          </div>
          <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
            <p className="text-muted-foreground text-sm font-medium mb-2">Pending Balance</p>
            <h2 className="text-3xl font-bold text-foreground mb-2">{formatCurrency(wallet.pending_balance || 0)}</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Clock className="w-3 h-3" />
              <span>Clearing in 1-3 days</span>
            </div>
          </div>
          <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
            <p className="text-muted-foreground text-sm font-medium mb-2">Total Earnings</p>
            <h2 className="text-3xl font-bold text-foreground mb-2">{formatCurrency(wallet.total_earnings || 0)}</h2>
            <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              <span>All time revenue</span>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-foreground mb-4">Payout History</h2>
      <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No payouts found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-gray-500 text-sm uppercase tracking-wide">
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {history.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">{payout.reference}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(payout.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(payout.amount)}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(payout.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Request Payout</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
              {payoutError && (
                <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4" />
                  {payoutError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min="100"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <select
                  required
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="" disabled>Select a bank</option>
                  {NIGERIAN_BANKS.map(bank => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="10 digit account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {payoutLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
