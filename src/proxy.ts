import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Everything requires a session except the login page/route, and the
// cron endpoint Vercel calls server-to-server on a schedule (which
// checks its own CRON_SECRET instead of a session — see
// src/app/api/cron/weekly-backup/route.ts). No public marketing pages,
// no multi-tenant routing — this is a single-user app behind a single
// gate.
const PUBLIC_PATHS = ["/login", "/api/login", "/api/cron"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except Next.js internals and static files,
     * so the gate covers pages and API routes alike.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
