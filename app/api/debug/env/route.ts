import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const presence = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? "present" : "missing"])
  );
  return NextResponse.json({ env: presence });
}
