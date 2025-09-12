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

  // 200 HTML + JS redirect so Set-Cookie survives
  const dest = `${url.origin}${next}`;
  const html = `<!doctype html><meta http-equiv="refresh" content="0;url=${dest}"><script>location.replace(${JSON.stringify(dest)})</script>`;
  const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const jar = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n) { return jar.get(n)?.value; },
        set(n, v, o?: CookieOptions) {
          const isProd = process.env.NODE_ENV === "production";
          res.cookies.set({ name: n, value: v, ...(o || {}), path: "/", sameSite: "lax", secure: isProd });
        },
        remove(n, o?: CookieOptions) {
          const isProd = process.env.NODE_ENV === "production";
          res.cookies.set({ name: n, value: "", ...(o || {}), path: "/", sameSite: "lax", secure: isProd, expires: new Date(0) });
        },
      },
    }
  );

  if (code) await supa.auth.exchangeCodeForSession(code);
  else if (token_hash && type) await supa.auth.verifyOtp({ token_hash, type });

  return res;
}

