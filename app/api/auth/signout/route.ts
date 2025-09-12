import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
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
  await supa.auth.signOut();
  return res;
}