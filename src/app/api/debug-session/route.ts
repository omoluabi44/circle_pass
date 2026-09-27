import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    hasSession: !!session,
    role: session?.user?.role,
    hasToken: !!session?.accessToken,
    tokenPreview: session?.accessToken ? session.accessToken.substring(0, 20) + '...' : null,
  });
}
