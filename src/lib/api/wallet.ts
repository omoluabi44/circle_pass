import { API_URL as API } from './config';

// ── Wallet ──────────────────────────────────────────────────────────────────

export async function getOrganizerWallet(token: string) {
  const res = await fetch(`${API}/organizer/wallet/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch wallet');
  return res.json();
}

export async function getRecentTransactions(token: string, page = 1) {
  const res = await fetch(`${API}/organizer/wallet/transactions/?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

// ── Bank Accounts ────────────────────────────────────────────────────────────

export async function getBankAccounts(token: string) {
  const res = await fetch(`${API}/organizer/bank-accounts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch bank accounts');
  return res.json();
}

export async function addBankAccount(token: string, data: {
  bank_code: string;
  bank_name: string;
  account_number: string;
}) {
  const res = await fetch(`${API}/organizer/bank-accounts/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to add bank account');
  }
  return res.json();
}

export async function deleteBankAccount(token: string, id: number) {
  const res = await fetch(`${API}/organizer/bank-accounts/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete bank account');
}

export async function setDefaultBankAccount(token: string, id: number) {
  const res = await fetch(`${API}/organizer/bank-accounts/${id}/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to set default account');
  return res.json();
}

export async function resolveBankAccount(token: string, bank_code: string, account_number: string) {
  const res = await fetch(`${API}/organizer/resolve_account/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bank_code, account_number }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.detail || err.message || 'Failed to verify account');
  }
  return res.json();
}

export async function getBanks(token: string) {
  const res = await fetch(`${API}/organizer/banks/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch banks');
  return res.json();
}

// ── Payout Fee Preview ───────────────────────────────────────────────────────

export async function getPayoutFeePreview(token: string, amountKobo: number) {
  const res = await fetch(`${API}/organizer/payouts/fee-preview/?amount=${amountKobo}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate fee');
  }
  return res.json() as Promise<{ amount_requested: number; payout_charge: number; amount_received: number }>;
}

// ── Payouts ──────────────────────────────────────────────────────────────────

export async function getPayoutHistory(token: string) {
  const res = await fetch(`${API}/organizer/payouts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return res.json();
}

export async function getPayoutDetail(token: string, id: number) {
  const res = await fetch(`${API}/organizer/payouts/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch payout details');
  return res.json();
}

export async function requestPayout(token: string, data: {
  amount: number;
  bank_account_id: number;
}) {
  const res = await fetch(`${API}/organizer/payouts/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Payout request failed');
  }
  return res.json();
}
