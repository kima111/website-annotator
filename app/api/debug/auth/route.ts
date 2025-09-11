import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const jar = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: auth, error } = await supa.auth.getUser();
  const hasAT = !!jar.get("sb-access-token");
  const hasRT = !!jar.get("sb-refresh-token");
  return NextResponse.json(
    {
      user: auth?.user ?? null,
      error: error?.message ?? null,
      cookies: { access: hasAT, refresh: hasRT },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
