import { OrganizerWallet, WalletTransaction, Payout, PayoutRequest } from '@/types';
import { API_URL as API } from './config';

export async function getOrganizerWallet(token: string): Promise<OrganizerWallet> {
  const res = await fetch(`${API}/organizer/wallet/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch wallet');
  return res.json();
}

export async function getWalletTransactions(token: string, page = 1): Promise<WalletTransaction[]> {
  const res = await fetch(`${API}/organizer/wallet/transactions/?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function requestPayout(token: string, data: PayoutRequest): Promise<Payout> {
  const res = await fetch(`${API}/organizer/payouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Payout request failed');
  }
  return res.json();
}

export async function getPayoutHistory(token: string): Promise<Payout[]> {
  const res = await fetch(`${API}/organizer/payouts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return res.json();
}
