import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "email and password required" }, { status: 400 });

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

  const { error } = await supa.auth.signInWithPassword({ email: body.email, password: body.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });

  // Ensure a profile row exists for FK constraints (owner/profile references)
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user;
  if (user) {
    try {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
      await admin.from("profiles").upsert({ id: user.id, email: user.email || null }, { onConflict: "id" });
    } catch {}
  }
  return res;
}
