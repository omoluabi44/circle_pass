import { API_URL } from './config';

export async function getVerificationStatus(token: string) {
  const res = await fetch(`${API_URL}/organizer/verification/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch verification status');
  return res.json();
}

export async function submitVerification(token: string, formData: FormData) {
  const res = await fetch(`${API_URL}/organizer/verification/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Do not set Content-Type to application/json, browser sets it for FormData
    },
    body: formData
  });
  if (!res.ok) throw new Error('Failed to submit verification');
  return res.json();
}
