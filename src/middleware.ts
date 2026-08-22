import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/sign-in",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Block public self-signup routes
  if (pathname.startsWith("/sign-up")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      "Public registration is disabled. Please log in with the credentials provided by HR."
    );
    return NextResponse.redirect(loginUrl);
  }

  // 2. Allow public endpoints & static assets
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 3. Check for auth cookie
  const token = request.cookies.get("dayflow_token")?.value;

  // If calling an API route without cookie, let the API route handler process authorization (e.g. Bearer header or Clerk)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If accessing a protected page without token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};