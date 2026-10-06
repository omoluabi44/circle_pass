"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Wallet,
  RefreshCw, X, AlertCircle, ChevronRight, Plus, Building2,
  TrendingUp, Download, Check, Trash2, CreditCard,
} from "lucide-react";
import {
  getOrganizerWallet, getRecentTransactions, getPayoutHistory,
  getBankAccounts, addBankAccount, deleteBankAccount,
  getBanks, resolveBankAccount, getPayoutFeePreview, requestPayout,
} from "@/lib/api/wallet";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WalletData {
  available_balance: number;
  total_earnings: number;
  total_payouts: number;
  pending_payout: number;
  updated_at: string;
}

interface Transaction {
  id: number;
  type: "CREDIT" | "PAYOUT" | "REVERSAL" | "RELEASE";
  amount: number;
  balance_after: number;
  reference: string;
  description: string;
  created_at: string;
}

interface Payout {
  id: number;
  amount: number;
  payout_charge: number;
  amount_received: number;
  status: "PROCESSING" | "SUCCESSFUL" | "FAILED" | "REVERSED";
  reference: string;
  bank_name: string;
  account_number: string;
  masked_account_number: string;
  account_name: string;
  failure_reason: string;
  requested_at: string;
  processed_at: string | null;
}

interface BankAccount {
  id: number;
  bank_name: string;
  bank_code: string;
  account_number: string;
  masked_number: string;
  account_name: string;
  is_default: boolean;
}

type ModalStep = "select-bank" | "add-bank" | "enter-amount" | "confirm" | "done";

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

const getStatusBadge = (s: string) => {
  const map: Record<string, { cls: string; label: string }> = {
    PROCESSING: { cls: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Processing" },
    SUCCESSFUL: { cls: "bg-green-500/10 text-green-500 border-green-500/20", label: "Successful" },
    FAILED:     { cls: "bg-red-500/10 text-red-500 border-red-500/20",     label: "Failed" },
    REVERSED:   { cls: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "Reversed" },
  };
  const m = map[s.toUpperCase()] ?? { cls: "bg-gray-500/10 text-gray-500 border-gray-500/20", label: s };
  return (
    <span className={`flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${m.cls}`}>
      {m.label}
    </span>
  );
};

const txIcon = (type: string) => {
  if (type === "CREDIT")   return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  if (type === "PAYOUT")   return <ArrowDownLeft className="w-4 h-4 text-primary" />;
  if (type === "REVERSAL") return <RefreshCw className="w-4 h-4 text-orange-500" />;
  return <RefreshCw className="w-4 h-4 text-muted-foreground" />;
};

// ── CSV Download ──────────────────────────────────────────────────────────────
const downloadPayoutCSV = (payout: Payout) => {
  const rows = [
    ["Field", "Value"],
    ["Reference", payout.reference],
    ["Status", payout.status],
    ["Withdrawal Amount", formatCurrency(payout.amount)],
    ["Payout Charge", formatCurrency(payout.payout_charge)],
    ["Amount Received", formatCurrency(payout.amount_received)],
    ["Bank", payout.bank_name],
    ["Account", payout.masked_account_number],
    ["Account Name", payout.account_name],
    ["Requested", new Date(payout.requested_at).toLocaleString()],
    ["Processed", payout.processed_at ? new Date(payout.processed_at).toLocaleString() : "—"],
    ...(payout.failure_reason ? [["Failure Reason", payout.failure_reason]] : []),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `payout-${payout.reference}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ── Nigerian Banks (fallback list) ────────────────────────────────────────────
const FALLBACK_BANKS = [
  { code: "044", name: "Access Bank" }, { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "Ecobank Nigeria" }, { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" }, { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" }, { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" }, { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" }, { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" }, { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" }, { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" }, { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "Opay" }, { code: "999991", name: "PalmPay" },
  { code: "50211", name: "Kuda Bank" }, { code: "90267", name: "Moniepoint" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<Payout[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Payout modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("select-bank");
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Add bank form
  const [banks, setBanks] = useState<{ code: string; name: string }[]>(FALLBACK_BANKS);
  const [addBankCode, setAddBankCode] = useState("");
  const [addBankName, setAddBankName] = useState("");
  const [addAccNumber, setAddAccNumber] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [addBankError, setAddBankError] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // Amount step
  const [amountNaira, setAmountNaira] = useState("");
  const [feePreview, setFeePreview] = useState<{ payout_charge: number; amount_received: number } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  // Confirm / submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Payout detail drawer
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  // Transaction detail drawer
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setPageError("");
      const [w, tx, h, ba] = await Promise.all([
        getOrganizerWallet(token),
        getRecentTransactions(token),
        getPayoutHistory(token),
        getBankAccounts(token),
      ]);
      setWallet(w);
      setTransactions(Array.isArray(tx) ? tx : tx.results ?? []);
      setHistory(Array.isArray(h) ? h : h.results ?? []);
      setBankAccounts(Array.isArray(ba) ? ba : []);
    } catch (e: any) {
      setPageError(e.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load bank list from Paystack
  useEffect(() => {
    if (!token) return;
    getBanks(token).then(d => {
      const list = d?.data;
      if (Array.isArray(list) && list.length > 0) {
        setBanks(list.map((b: any) => ({ code: b.code, name: b.name })));
      }
    }).catch(() => {/* keep fallback */});
  }, [token]);

  // ── Open Modal ──────────────────────────────────────────────────────────────
  const openModal = () => {
    setStep(bankAccounts.length === 0 ? "add-bank" : "select-bank");
    setSelectedAccount(bankAccounts.find(a => a.is_default) ?? null);
    setAmountNaira(""); setFeePreview(null); setSubmitError("");
    resetAddBankForm();
    setModalOpen(true);
  };

  const resetAddBankForm = () => {
    setAddBankCode(""); setAddBankName(""); setAddAccNumber("");
    setResolvedName(""); setResolving(false); setAddBankError(""); setSavingBank(false);
  };

  const closeModal = () => { setModalOpen(false); resetAddBankForm(); };

  // ── Account number resolve (debounced) ──────────────────────────────────────
  useEffect(() => {
    if (!addBankCode || addAccNumber.length !== 10 || !token) { setResolvedName(""); return; }
    const t = setTimeout(async () => {
      setResolving(true); setAddBankError(""); setResolvedName("");
      try {
        const res = await resolveBankAccount(token, addBankCode, addAccNumber);
        setResolvedName(res?.data?.account_name || "");
      } catch (e: any) {
        setAddBankError(e.message || "Could not verify account");
      } finally {
        setResolving(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [addBankCode, addAccNumber, token]);

  // ── Fee Preview (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!amountNaira || !token) { setFeePreview(null); return; }
    const kobo = Math.round(parseFloat(amountNaira) * 100);
    if (isNaN(kobo) || kobo < 10_000) { setFeePreview(null); return; }
    const t = setTimeout(async () => {
      setFeeLoading(true);
      try {
        const p = await getPayoutFeePreview(token, kobo);
        setFeePreview({ payout_charge: p.payout_charge, amount_received: p.amount_received });
      } catch { setFeePreview(null); }
      finally { setFeeLoading(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [amountNaira, token]);

  // ── Save Bank Account ────────────────────────────────────────────────────────
  const handleSaveAccount = async () => {
    if (!token || !resolvedName) return;
    setSavingBank(true); setAddBankError("");
    try {
      const acct = await addBankAccount(token, {
        bank_code: addBankCode,
        bank_name: addBankName,
        account_number: addAccNumber,
      });
      setBankAccounts(prev => [...prev, acct]);
      setSelectedAccount(acct);
      resetAddBankForm();
      setStep("enter-amount");
    } catch (e: any) {
      setAddBankError(e.message || "Failed to save account");
    } finally {
      setSavingBank(false);
    }
  };

  // ── Submit Payout ────────────────────────────────────────────────────────────
    const handleDeleteBank = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Are you sure you want to remove this bank account?")) return;
    try {
      await deleteBankAccount(token, id);
      setBankAccounts(prev => prev.filter(a => a.id !== id));
      if (selectedAccount?.id === id) setSelectedAccount(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete bank account");
    }
  };

  const handleConfirmPayout = async () => {
    if (!token || !selectedAccount || !feePreview) return;
    setSubmitting(true); setSubmitError("");
    const kobo = Math.round(parseFloat(amountNaira) * 100);
    try {
      await requestPayout(token, { amount: kobo, bank_account_id: selectedAccount.id });
      setStep("done");
      await fetchAll();
    } catch (e: any) {
      setSubmitError(e.message || "Payout failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 max-w-5xl mx-auto flex justify-center pt-20">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (pageError) return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-2">
        <AlertCircle className="w-5 h-5 shrink-0" />{pageError}
      </div>
    </div>
  );

  const amountKobo = amountNaira ? Math.round(parseFloat(amountNaira) * 100) : 0;
  const canProceedAmount = amountKobo >= 10_000 && !!feePreview && !feeLoading;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your wallet and request payouts.</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          <Wallet className="w-4 h-4" /> Request Payout
        </button>
      </header>

      {/* Balance Cards */}
      {wallet && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* All-Time Earnings */}
          <div className="bg-background border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-5">
              <TrendingUp className="w-16 h-16 text-primary" />
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">All-Time Earnings</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet.total_earnings)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-green-500 font-medium">
              <ArrowUpRight className="w-3 h-3" /><span>All time revenue</span>
            </div>
          </div>

          {/* Available Balance */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <Wallet className="w-16 h-16 text-primary" />
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">Available Balance</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet.available_balance)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-green-500 font-medium">
              <Check className="w-3 h-3" /><span>Ready for withdrawal</span>
            </div>
          </div>

          {/* Pending Payout */}
          <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">Pending Payout</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet.pending_payout)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-500 font-medium">
              <Clock className="w-3 h-3" /><span>Awaiting transfer</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-3">Recent Transactions</h2>
        <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.slice(0, 10).map(tx => (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="p-1.5 rounded-full bg-muted shrink-0">{txIcon(tx.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.reference}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${tx.type === "CREDIT" ? "text-green-600" : tx.type === "REVERSAL" ? "text-orange-500" : "text-foreground"}`}>
                      {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Payout History */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Payout History</h2>
        <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No payouts yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {history.map(p => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedPayout(p)}
                >
                  <div className="p-1.5 rounded-full bg-muted shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.bank_name}</p>
                    <p className="text-xs text-muted-foreground">{p.masked_account_number} · {new Date(p.requested_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                    {getStatusBadge(p.status)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Payout Request Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground">
                {step === "select-bank" && "Select Bank Account"}
                {step === "add-bank"    && "Add Bank Account"}
                {step === "enter-amount" && "Withdrawal Amount"}
                {step === "confirm"     && "Confirm Payout"}
                {step === "done"        && "Payout Submitted"}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">

              {/* ── Step: Select Bank Account ── */}
              {step === "select-bank" && (
                <div className="space-y-3">
                  {bankAccounts.map(acct => (
                    <label
                      key={acct.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                        selectedAccount?.id === acct.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio" name="bank-account" className="accent-primary"
                        checked={selectedAccount?.id === acct.id}
                        onChange={() => setSelectedAccount(acct)}
                      />
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{acct.bank_name}</p>
                        <p className="text-xs text-muted-foreground">{acct.account_name} · {acct.masked_number}</p>
                      </div>
                      {acct.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Default</span>
                      )}
                    </label>
                  ))}

                  <button
                    onClick={() => setStep("add-bank")}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl p-3.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Account
                  </button>

                  <button
                    disabled={!selectedAccount}
                    onClick={() => setStep("enter-amount")}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* ── Step: Add Bank Account ── */}
              {step === "add-bank" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Bank Name</label>
                    <select
                      value={addBankCode}
                      onChange={e => {
                        const code = e.target.value;
                        const name = banks.find(b => b.code === code)?.name ?? "";
                        setAddBankCode(code);
                        setAddBankName(name);
                        setResolvedName("");
                        setAddBankError("");
                      }}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background"
                    >
                      <option value="">Select a bank</option>
                      {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Account Number</label>
                    <input
                      type="text" maxLength={10}
                      value={addAccNumber}
                      onChange={e => { setAddAccNumber(e.target.value.replace(/\D/g, "")); setResolvedName(""); setAddBankError(""); }}
                      placeholder="10-digit account number"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Account resolution feedback */}
                  {resolving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying account…
                    </div>
                  )}
                  {resolvedName && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                      <p className="text-xs text-muted-foreground mb-0.5">Account Name</p>
                      <p className="font-semibold text-green-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />{resolvedName}
                      </p>
                    </div>
                  )}
                  {addBankError && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4 shrink-0" />{addBankError}
                    </div>
                  )}

                  <button
                    disabled={!resolvedName || savingBank}
                    onClick={handleSaveAccount}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {savingBank && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Account
                  </button>

                  {bankAccounts.length > 0 && (
                    <button onClick={() => setStep("select-bank")} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
                      ← Back to saved accounts
                    </button>
                  )}
                </div>
              )}

              {/* ── Step: Enter Amount ── */}
              {step === "enter-amount" && (
                <div className="space-y-4">
                  {selectedAccount && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{selectedAccount.bank_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedAccount.account_name} · {selectedAccount.masked_number}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-xl font-bold text-foreground">{wallet ? formatCurrency(wallet.available_balance) : "—"}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Amount to Withdraw</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                      <input
                        type="number" min="100" step="100"
                        value={amountNaira}
                        onChange={e => setAmountNaira(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-border rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Minimum ?100</p>
                  </div>

                  {/* Live fee preview */}
                  {feeLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Calculating charge…
                    </div>
                  )}
                  {feePreview && !feeLoading && (
                    <div className="border border-border rounded-xl overflow-hidden text-sm">
                      <div className="flex justify-between px-4 py-2.5 border-b border-border">
                        <span className="text-muted-foreground">Withdrawal amount</span>
                        <span className="font-medium text-foreground">{formatCurrency(amountKobo)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 border-b border-border">
                        <span className="text-muted-foreground">Payout charge</span>
                        <span className="font-medium text-orange-500">−{formatCurrency(feePreview.payout_charge)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 bg-muted/30">
                        <span className="font-semibold text-foreground">You will receive</span>
                        <span className="font-bold text-green-600">{formatCurrency(feePreview.amount_received)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!canProceedAmount}
                    onClick={() => setStep("confirm")}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Continue
                  </button>
                  <button onClick={() => setStep("select-bank")} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
                    ← Change account
                  </button>
                </div>
              )}

              {/* ── Step: Confirm ── */}
              {step === "confirm" && feePreview && selectedAccount && (
                <div className="space-y-4">
                  <div className="border border-border rounded-xl overflow-hidden text-sm">
                    <div className="flex justify-between px-4 py-3 border-b border-border">
                      <span className="text-muted-foreground">Withdrawal</span>
                      <span className="font-semibold">{formatCurrency(amountKobo)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 border-b border-border">
                      <span className="text-muted-foreground">Payout charge</span>
                      <span className="font-semibold text-orange-500">−{formatCurrency(feePreview.payout_charge)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 border-b border-border bg-green-50">
                      <span className="font-semibold text-green-700">You will receive</span>
                      <span className="font-bold text-green-700">{formatCurrency(feePreview.amount_received)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-muted/20">
                      <span className="text-muted-foreground text-xs">Total deducted from balance</span>
                      <span className="font-bold text-xs">{formatCurrency(amountKobo)}</span>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl px-4 py-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1.5">Receiving Account</p>
                    <p className="font-semibold text-foreground">{selectedAccount.bank_name}</p>
                    <p className="text-muted-foreground text-xs">{selectedAccount.account_name} · {selectedAccount.masked_number}</p>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0" />{submitError}
                    </div>
                  )}

                  <button
                    disabled={submitting}
                    onClick={handleConfirmPayout}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirm Payout
                  </button>
                  <button onClick={() => setStep("enter-amount")} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
                    ← Edit amount
                  </button>
                </div>
              )}

              {/* ── Step: Done ── */}
              {step === "done" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Payout Processing</h4>
                    <p className="text-sm text-muted-foreground mt-1">Your payout is on its way. We&apos;ll update the status once Paystack confirms the transfer.</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Payout Detail Drawer ── */}
      {selectedPayout && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground">Payout Details</h3>
              <button onClick={() => setSelectedPayout(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="flex justify-center">{getStatusBadge(selectedPayout.status)}</div>

              <div className="border border-border rounded-xl overflow-hidden text-sm">
                {[
                  ["Amount Requested", formatCurrency(selectedPayout.amount)],
                  ["Payout Charge",    formatCurrency(selectedPayout.payout_charge)],
                  ["Amount Received",  formatCurrency(selectedPayout.amount_received)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-3 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              <div className="border border-border rounded-xl overflow-hidden text-sm">
                {[
                  ["Date",             new Date(selectedPayout.requested_at).toLocaleDateString("en-NG", { dateStyle: "medium" })],
                  ["Bank",             selectedPayout.bank_name],
                  ["Account",          `${selectedPayout.account_name} · ${selectedPayout.masked_account_number}`],
                  ["Reference",        selectedPayout.reference],
                  ...(selectedPayout.processed_at ? [["Processed", new Date(selectedPayout.processed_at).toLocaleDateString("en-NG", { dateStyle: "medium" })]] : []),
                  ...(selectedPayout.failure_reason ? [["Reason", selectedPayout.failure_reason]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 border-b border-border last:border-0">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-right break-all">{v}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => downloadPayoutCSV(selectedPayout)}
                className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Detail Drawer ── */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="border border-border rounded-xl overflow-hidden text-sm">
                {[
                  ["Type",      selectedTx.type],
                  ["Amount",    formatCurrency(selectedTx.amount)],
                  ["Balance After", formatCurrency(selectedTx.balance_after)],
                  ["Reference", selectedTx.reference],
                  ["Date",      new Date(selectedTx.created_at).toLocaleDateString("en-NG", { dateStyle: "long" })],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 border-b border-border last:border-0">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-right break-all">{v}</span>
                  </div>
                ))}
              </div>
              {selectedTx.description && (
                <div className="border border-border rounded-xl px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground">{selectedTx.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
