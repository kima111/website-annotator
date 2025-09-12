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
        set(n, v, o?: CookieOptions) { res.cookies.set({ name: n, value: v, ...(o || {}) }); },
        remove(n, o?: CookieOptions) { res.cookies.set({ name: n, value: "", ...(o || {}), expires: new Date(0) }); },
      },
    }
  );
  await supa.auth.signOut();
  return res;
}