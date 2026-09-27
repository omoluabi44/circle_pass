import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Explicitly allow public routes (fallback in case matcher fails)
    if (!path.startsWith("/dashboard") && !path.startsWith("/organizer") && !path.startsWith("/admin")) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string | undefined;

    // Admin routes require ADMIN role
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Organizer routes require ORGANIZER or ADMIN role
    if (path.startsWith("/organizer") && role !== "ORGANIZER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the middleware function handle the logic entirely
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/organizer/:path*", "/admin/:path*"],
};
