/**
 * Next.js Middleware — Route Protection + Role Enforcement
 *
 * Runs on every request before it hits a page or API route.
 *
 * Rules:
 *   /dashboard/* → requires JWT with rep/admin/super_admin role
 *   /portal/*    → requires JWT with any authenticated role
 *   /api/*       → requires JWT (except webhooks, billing/webhook, auth routes, onboarding)
 *   /login       → redirect to /dashboard if already authenticated
 *   /onboarding  → public (no auth needed)
 *   Everything else → public
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Routes that never require auth
const PUBLIC_ROUTES = [
  "/login",
  "/onboarding",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/onboarding",
  "/api/billing/webhook",
  "/api/webhooks/meta-leads",
  // Public client-facing routes — no login required
  "/review",             // /review/[token] — client approval pages
  "/lp",                 // /lp/[slug]      — live landing pages
  "/api/review",         // review session API (create + respond)
  "/api/lp",             // landing page publish + lead capture
  "/api/social/callback", // OAuth callbacks come from external platforms (no cookie)
];

// Routes that require rep/admin/super_admin role
const INTERNAL_ROUTES = ["/dashboard"];

// Routes that require any authenticated user (clients included)
const AUTHENTICATED_ROUTES = ["/portal"];

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET ?? "dev-secret-replace-in-production";
  return new TextEncoder().encode(s);
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function isInternalRoute(pathname: string): boolean {
  return INTERNAL_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthenticatedRoute(pathname: string): boolean {
  return AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  return !PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

const INTERNAL_ROLES = new Set(["admin", "manager", "executive", "super_admin", "rep"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (isPublic(pathname)) {
    // If already logged in and hitting /login, redirect to dashboard
    if (pathname === "/login") {
      const token = req.cookies.get("auth-token")?.value;
      if (token) {
        try {
          await jwtVerify(token, getSecret());
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } catch {
          // Invalid token — let them see the login page
        }
      }
    }
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const cookieToken = req.cookies.get("auth-token")?.value;
  const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken ?? headerToken;

  // No token — redirect to login (for pages) or 401 (for API)
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let payload: { sub?: string; email?: string; tenantId?: string; role?: string };
  try {
    const { payload: p } = await jwtVerify(token, getSecret());
    payload = p as typeof payload;
  } catch {
    // Expired or invalid token
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("auth-token");
    return res;
  }

  const role = payload.role ?? "";

  // Internal routes: must be rep/admin
  if (isInternalRoute(pathname) && !INTERNAL_ROLES.has(role)) {
    // Client users hitting /dashboard → redirect to their portal
    if (role === "client" || role === "client_owner") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protected API routes: must have any valid role
  if (isProtectedApi(pathname) && !role) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Authenticated routes (/portal): any logged-in user
  if (isAuthenticatedRoute(pathname) && !role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Pass tenant info to the request headers for server components
  const requestHeaders = new Headers(req.headers);
  if (payload.tenantId) requestHeaders.set("x-tenant-id", payload.tenantId);
  if (payload.sub) requestHeaders.set("x-user-id", payload.sub);
  if (role) requestHeaders.set("x-user-role", role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
