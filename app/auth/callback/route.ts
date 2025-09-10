import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // IMPORTANT: cookie write path

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supa = createClient();         // use the writeable server client
    const { error } = await supa.auth.exchangeCodeForSession(code);
    // (optional) quick debug if needed:
    // if (url.searchParams.get("debug")) return NextResponse.json({ ok: !error, error: error?.message ?? null });
  }

  return NextResponse.redirect(`${url.origin}${next}`); // same-origin redirect
}
