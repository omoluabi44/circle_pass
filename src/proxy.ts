import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Explicitly allow public routes (fallback in case matcher fails)
  if (
    !path.startsWith("/dashboard") &&
    !path.startsWith("/organizer") &&
    !path.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  const CURRENT_SESSION_VERSION = 2;

  // 1. Attempt to decode the JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 2. If there is NO valid token, or accessToken is missing, or session version is outdated,
  // force user to re-login.
  if (!token || !token.accessToken || token.sessionVersion !== CURRENT_SESSION_VERSION) {
    const loginUrl = new URL("/login", req.url);
    // Use only pathname+search so Docker/proxy internal hostnames never leak
    const callbackPath = req.nextUrl.pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(loginUrl);
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
