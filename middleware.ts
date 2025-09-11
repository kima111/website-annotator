// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const CANONICAL = process.env.CANONICAL_HOST || ""; // e.g. "website-annotator.vercel.app"

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = process.env.VERCEL_ENV === "production";
  const accept = req.headers.get("accept") || "";
  const path = req.nextUrl.pathname;
  const hasSession = !!req.cookies.get("sb-access-token") || !!req.cookies.get("sb-refresh-token");

  // Only redirect real page navigations (GET + Accept: text/html)
  const isHtmlNav =
    req.method === "GET" &&
    accept.includes("text/html") &&
    !path.startsWith("/_next") &&
    !/\.[a-z0-9]+$/i.test(path) &&
    // never redirect these
    !path.startsWith("/api") &&
    !path.startsWith("/auth") &&
    !path.startsWith("/annotate");

  if (isProd && CANONICAL && host && host !== CANONICAL && isHtmlNav) {
    // Only normalize www <-> apex. Avoid cross-subdomain redirects that would drop cookies.
    const stripW = (h: string) => h.replace(/^www\./i, "");
    if (stripW(host) === stripW(CANONICAL) && !hasSession) {
      const url = new URL(req.url);
      url.host = CANONICAL;
      return NextResponse.redirect(url, 308);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
