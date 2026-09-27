import { API_URL } from './config';

export async function verifyPayment(reference: string): Promise<any> {
  const res = await fetch(`${API_URL}/payments/verify/?reference=${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Payment verification failed');
  }

  return res.json();
}
