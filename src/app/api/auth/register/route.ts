import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, role, phone_number } = body;

    if (!email || !password || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/auth/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username,
        password,
        role: role || "ATTENDEE",
        ...(phone_number && { phone_number }),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Djoser usually returns field-specific errors
      const errorMsg = data.email?.[0] || data.username?.[0] || data.password?.[0] || data.detail || "Registration failed";
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Registration route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
