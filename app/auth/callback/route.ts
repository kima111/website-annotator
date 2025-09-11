// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // cookie writes require Node runtime

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const debug = url.searchParams.get("debug");

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "magiclink"
    | "recovery"
    | "invite"
    | "email_change"
    | "signup"
    | null;

  const supa = createClient();
  let errorMsg: string | null = null;

  if (code) {
    const { error } = await supa.auth.exchangeCodeForSession(code);
    errorMsg = error?.message ?? null;
  } else if (token_hash && type) {
    const { error } = await supa.auth.verifyOtp({ token_hash, type });
    errorMsg = error?.message ?? null;
  } else {
    errorMsg = "missing code/token_hash";
  }

  if (debug) {
    return NextResponse.json({ ok: !errorMsg, error: errorMsg, origin: url.origin, next });
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
