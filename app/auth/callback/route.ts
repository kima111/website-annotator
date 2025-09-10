// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  if (code) {
    const supa = createClient();
    await supa.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${url.origin}${next}`); // <-- no localhost here
}
