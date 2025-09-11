// middleware.ts (with-supabase style): refresh session on each request so SSR sees it
import { NextResponse, NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const CANONICAL = process.env.CANONICAL_HOST || ""; // e.g. "website-annotator.vercel.app"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set({ name, value, ...(options || {}) });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set({ name, value: "", ...(options || {}), expires: new Date(0) });
        },
      },
    }
  );

  // Touch/refresh the session cookies if needed
  await supabase.auth.getSession().catch(() => null);

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
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
