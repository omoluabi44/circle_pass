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

  // Manually decode the NextAuth JWT from the session cookie
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Admin routes require ADMIN role
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Organizer routes require ORGANIZER or ADMIN role
  if (
    path.startsWith("/organizer") &&
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
