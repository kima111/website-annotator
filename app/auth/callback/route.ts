// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // cookie write path works only on Node

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const debug = url.searchParams.get("debug"); // add &debug=1 to see JSON

  let err: string | null = null;
  if (code) {
    const supa = createClient(); // WRITEABLE server client (not RSC)
    const { error } = await supa.auth.exchangeCodeForSession(code);
    err = error?.message ?? null;
  } else {
    err = "missing code";
  }

  if (debug) {
    // Temporarily returns JSON so you can see if the exchange failed
    return NextResponse.json({ ok: !err, error: err, origin: url.origin, next });
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
