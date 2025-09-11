import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supa = createClient();
  await supa.auth.signOut();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`);
}
