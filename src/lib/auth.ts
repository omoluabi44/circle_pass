import { cookies } from "next/headers";
import { API_URL } from "@/lib/api/config";
import { User } from "@/types";

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("refresh_token_cookies")?.value;
    const role = cookieStore.get("user_role")?.value;

    if (!token) return null;

    // Fetch user details from backend using the access token
    const res = await fetch(`${API_URL}/auth/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const user: User = {
      id: data.id,
      email: data.email,
      username: data.username,
      name: data.name || data.username,
      role: data.role || role || "ATTENDEE",
      isEmailVerified: data.is_email_verified ?? true,
      phone_number: data.phone_number,
      avatar: data.avatar,
    };

    return {
      user,
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function checkRole(role: string) {
  const user = await getCurrentUser();
  return user?.role === role;
}
