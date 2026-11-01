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

  // 1. Direct cookie check (Bulletproof fallback for Edge runtime bugs & chunked cookies)
  const hasSessionCookie = req.cookies.getAll().some(c =>
    c.name.startsWith("next-auth.session-token") ||
    c.name.startsWith("__Secure-next-auth.session-token")
  );

  // 2. Attempt to decode the JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If there is NO token AND NO session cookie, redirect to login
  if (!token && !hasSessionCookie) {
    const loginUrl = new URL("/login", req.url);
    // Use only the pathname+search so Docker/proxy internal hostnames never
    // leak into the callbackUrl that the login page will router.push() to.
    const callbackPath = req.nextUrl.pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("callbackUrl", callbackPath);
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
