import { API_URL } from "./config";

export async function toggleSaveEvent(eventId: number, token: string) {
  const res = await fetch(`${API_URL}/events/${eventId}/save/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to toggle save state");
  }
  return res.json();
}

export async function toggleFollowOrganizer(organizerId: number, token: string) {
  const res = await fetch(`${API_URL}/organizers/${organizerId}/follow/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to toggle follow state");
  }
  return res.json();
}
