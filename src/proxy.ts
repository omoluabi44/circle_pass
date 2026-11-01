import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("refresh_token_cookies")?.value || req.cookies.get("access_token")?.value;
  const role = req.cookies.get("user_role")?.value;
  const { pathname, search } = req.nextUrl;

  const protectedRoutes = ["/dashboard", "/organizer", "/admin"];
  const publicOnlyRoutes = ["/login", "/register"];

  // 1. If not logged in and accessing a protected route -> redirect to login with callbackUrl
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !token) {
    const loginUrl = new URL("/login", req.url);
    const intendedPath = `${pathname}${search || ""}`;
    if (intendedPath && intendedPath !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", intendedPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Admin routes require ADMIN role
  if (pathname.startsWith("/admin") && role && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. Organizer routes require ORGANIZER or ADMIN role
  if (pathname.startsWith("/organizer") && role && role !== "ORGANIZER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 4. If logged in and hitting public-only auth routes (/login, /register) -> redirect away
  if (publicOnlyRoutes.some((route) => pathname === route) && token) {
    const redirectParam = req.nextUrl.searchParams.get("callbackUrl") || req.nextUrl.searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      return NextResponse.redirect(new URL(redirectParam, req.url));
    }
    const defaultRoute = role === "ADMIN" ? "/admin" : role === "ORGANIZER" ? "/organizer" : "/dashboard";
    return NextResponse.redirect(new URL(defaultRoute, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/organizer/:path*", "/admin/:path*", "/login", "/register"],
};
