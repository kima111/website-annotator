import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
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
  await supa.auth.signOut();
  return res;
}