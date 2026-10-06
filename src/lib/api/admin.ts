import { Payout } from '@/types';
import { API_URL } from './config';


export async function getAdminOverview(token: string) {
  const res = await fetch(`${API_URL}/admin/overview/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch admin overview: ${res.status} ${res.statusText} — ${body}`);
  }
  return res.json();
}

export async function getAdminUsers(token: string) {
  const res = await fetch(`${API_URL}/admin/users/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch admin users');
  return res.json();
}

export async function getAdminOrganizerVerifications(token: string) {
  const res = await fetch(`${API_URL}/admin/organizer-verifications/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch admin organizer verifications');
  return res.json();
}

export async function getAdminOrganizerVerification(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/organizer-verifications/${id}/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch admin organizer verification detail. Status: ${res.status}. Body: ${text}`);
  }
  return res.json();
}

export async function approveOrganizerVerification(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/organizer-verifications/${id}/approve/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to approve verification');
  return res.json();
}

export async function rejectOrganizerVerification(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/organizer-verifications/${id}/reject/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to reject verification');
  return res.json();
}

export async function getAdminEvents(token: string) {
  const res = await fetch(`${API_URL}/admin/events/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch admin events: ${res.status} ${res.statusText} — ${body}`);
  }
  return res.json();
}

export async function getAdminEvent(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/events/${id}/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch admin event detail. Status: ${res.status}. Body: ${text}`);
  }
  return res.json();
}

export async function approveEvent(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/events/${id}/approve/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to approve event');
  return res.json();
}

export async function rejectEvent(token: string, id: number) {
  const res = await fetch(`${API_URL}/admin/events/${id}/reject/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to reject event');
  return res.json();
}

export async function getAdminPayouts(token: string, statusFilter?: string): Promise<Payout[]> {
  const params = statusFilter ? `?status=${statusFilter}` : '';
  const res = await fetch(`${API_URL}/admin/payouts/${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return res.json();
}

export async function approvePayout(token: string, id: number): Promise<Payout> {
  const res = await fetch(`${API_URL}/admin/payouts/${id}/approve/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to approve payout');
  return res.json();
}

export async function rejectPayout(token: string, id: number, reason: string): Promise<Payout> {
  const res = await fetch(`${API_URL}/admin/payouts/${id}/reject/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to reject payout');
  return res.json();
}


export async function deleteAdminUser(token: string, userId: number) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return true;
}
