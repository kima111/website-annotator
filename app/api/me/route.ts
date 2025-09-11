// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supa = createClient();
  const { data, error } = await supa.auth.getUser();
  return NextResponse.json({
    user: data?.user ?? null,
    error: error?.message ?? (data?.user ? null : "Auth session missing!"),
  });
}
