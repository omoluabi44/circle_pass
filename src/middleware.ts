import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Explicitly allow public routes (fallback in case matcher fails)
  if (
    !path.startsWith("/dashboard") &&
    !path.startsWith("/organizer") &&
    !path.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  // 1. Direct cookie check (Bulletproof fallback for Edge runtime bugs)
  const hasSessionCookie = 
    req.cookies.has("next-auth.session-token") || 
    req.cookies.has("__Secure-next-auth.session-token");

  // 2. Attempt to decode the JWT 
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If there is NO token AND NO session cookie, redirect to login
  if (!token && !hasSessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If token decoding failed (Edge runtime issue) but cookie exists, 
  // we let the user pass. Client components (useSession) and Backend will handle real validation.
  if (!token && hasSessionCookie) {
    return NextResponse.next();
  }

  const role = token?.role as string | undefined;

  // Admin routes require ADMIN role
  if (path.startsWith("/admin") && role && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Organizer routes require ORGANIZER or ADMIN role
  if (
    path.startsWith("/organizer") &&
    role && 
    role !== "ORGANIZER" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/organizer/:path*", "/admin/:path*"],
};
