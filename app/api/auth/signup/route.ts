import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const url = new URL(req.url);
  const dest = `${url.origin}/auth/callback?next=/`;
  const res = NextResponse.json({ ok: true });

  const jar = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return jar.get(name)?.value; },
        set(name: string, value: string, options?: CookieOptions) { res.cookies.set({ name, value, ...(options || {}) }); },
        remove(name: string, options?: CookieOptions) { res.cookies.set({ name, value: "", ...(options || {}), expires: new Date(0) }); },
      },
    }
  );

  const { error } = await supa.auth.signUp({
    email: body.email,
    password: body.password,
    options: { emailRedirectTo: dest },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return res;
}
