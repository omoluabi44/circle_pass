import { API_URL } from "./config";

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
