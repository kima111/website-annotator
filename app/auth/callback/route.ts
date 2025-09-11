// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "magiclink" | "recovery" | "invite" | "email_change" | "signup" | null;

  // HTML 200 + JS redirect to ensure Set-Cookie is preserved
  const dest = `${url.origin}${next}`;
  const html = `<!doctype html><meta http-equiv="refresh" content="0;url=${dest}"><script>location.replace(${JSON.stringify(dest)})</script>`;
  const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const jar = cookies();
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return jar.get(name)?.value; },
        set(name: string, value: string, options?: CookieOptions) {
          const o = { ...(options||{}), ...(cookieDomain ? { domain: cookieDomain } : {}) } as CookieOptions;
          res.cookies.set({ name, value, ...o });
        },
        remove(name: string, options?: CookieOptions) {
          const o = { ...(options||{}), ...(cookieDomain ? { domain: cookieDomain } : {}) } as CookieOptions;
          res.cookies.set({ name, value: "", ...o, expires: new Date(0) });
        },
      },
    }
  );

  if (code) {
    await supa.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    await supa.auth.verifyOtp({ token_hash, type });
  }
  return res;
}

