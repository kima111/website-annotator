// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const CANONICAL = process.env.CANONICAL_HOST || ""; // e.g. "website-annotator.vercel.app"

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = process.env.VERCEL_ENV === "production";
  const accept = req.headers.get("accept") || "";
  const path = req.nextUrl.pathname;

  // Only redirect real page navigations (GET + Accept: text/html) and skip auth/api
  const isHtmlNav =
    req.method === "GET" &&
    accept.includes("text/html") &&
    !path.startsWith("/_next") &&
    !/\.[a-z0-9]+$/i.test(path) &&
    !path.startsWith("/api") &&
    !path.startsWith("/auth");

  if (isProd && CANONICAL && host && host !== CANONICAL && isHtmlNav) {
    const url = new URL(req.url);
    url.host = CANONICAL;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
