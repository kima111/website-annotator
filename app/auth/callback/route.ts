// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "magiclink" | "recovery" | "invite" | "email_change" | "signup" | null;

  const supa = createClient();
  if (code) {
    await supa.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    await supa.auth.verifyOtp({ token_hash, type });
  }
  return NextResponse.redirect(`${url.origin}${next}`);
}
