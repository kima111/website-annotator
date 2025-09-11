import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const url = new URL(req.url);
  const redirectTo = `${url.origin}/auth/callback?next=/`;

  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n)=>cookies().get(n)?.value, set(){}, remove(){} } }
  );
  const { error } = await supa.auth.resetPasswordForEmail(body.email, { redirectTo });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
