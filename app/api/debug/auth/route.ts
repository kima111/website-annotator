import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const jar = cookies();
  const cookieSnapshot = Object.fromEntries(
    [
      "sb-access-token",
      "sb-refresh-token",
      "supabase-auth-token",
      "sb:token",
    ].map((k) => [k, jar.get(k)?.value ? "present" : "-"])
  );

  const supa = createClient();
  const { data, error } = await supa.auth.getUser();
  return NextResponse.json({
    cookies: cookieSnapshot,
    user: data?.user ?? null,
    error: error?.message ?? null,
  });
}
