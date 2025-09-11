// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const CANONICAL = "website-annotator.vercel.app";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isProd = process.env.VERCEL_ENV === "production";

  // Only redirect real page navigations (GET + Accept: text/html)
  const accept = req.headers.get("accept") || "";
  const isHtmlNav =
    req.method === "GET" &&
    accept.includes("text/html") &&
    // exclude Next internals and assets by path
    !req.nextUrl.pathname.startsWith("/_next") &&
    !/\.[a-z0-9]+$/i.test(req.nextUrl.pathname);

  if (isProd && host && host !== CANONICAL && isHtmlNav) {
    const url = new URL(req.url);
    url.host = CANONICAL;
    return NextResponse.redirect(url, 308);
  }

  // Never redirect API/auth/callback/etc. so Set-Cookie survives
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
