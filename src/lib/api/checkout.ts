import { CheckoutRequest, CheckoutResponse } from '@/types';
import { API_URL } from './config';

export async function checkout(data: CheckoutRequest, token?: string): Promise<CheckoutResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}/orders/checkout/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 || errorData?.code === 'token_not_valid' || errorData?.detail === 'Given token not valid for any token type') {
      throw new Error("Your session has expired. Please refresh the page or log in again.");
    }
    throw new Error(errorData.detail || 'Checkout failed');
  }
  
  return res.json();
}
