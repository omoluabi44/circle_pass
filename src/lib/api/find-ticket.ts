import { API_URL } from "./config";
import { fetchWithAuth } from "./fetchWithAuth";

export const findTicket = async (payload: { order_reference?: string, email?: string, phone_number?: string }) => {
  const response = await fetch(`${API_URL}/tickets/find/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || "Failed to find ticket");
  }
  
  return response.json();
};

/**
 * Resolve pass links for tickets the signed-in user is allowed to view.
 * The public find-ticket response never carries QR tokens; this call is
 * authenticated and is checked server-side against the buyer email,
 * the event's organizer and admins.
 */
export const requestTicketAccess = async (
  token: string,
  payload: { order_reference?: string, email?: string, phone_number?: string }
) => {
  const response = await fetchWithAuth(`${API_URL}/tickets/access/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "You do not have access to these tickets");
  }

  return response.json();
};
