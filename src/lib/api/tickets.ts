import { API_URL } from './config';

export async function getMyTickets(token: string) {
  const res = await fetch(`${API_URL}/tickets/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  // Handle paginated or unpaginated responses
  return Array.isArray(data) ? data : (data.results || []);
}

export async function getTicketById(token: string, id: string | number) {
  const res = await fetch(`${API_URL}/tickets/${id}/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json();
}
