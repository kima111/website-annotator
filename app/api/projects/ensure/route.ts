// app/api/projects/ensure/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// GET /api/projects/ensure?project=<id>
// GET /api/projects/ensure?url=<any full URL>
export async function GET(req: NextRequest) {
  // 1) Must be logged in – read session from request cookies (server client with write perms)
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supa = admin();
  const sp = req.nextUrl.searchParams;

  // 2) If a project id is forwarded, just verify access and return it
  const fwd = sp.get("project");
  if (fwd) {
    // owner?
    const proj = await supa.from("projects").select("id,owner,name,origin").eq("id", fwd).maybeSingle();
    if (proj.error) return NextResponse.json({ error: proj.error.message }, { status: 404 });
    if (!proj.data) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (proj.data.owner !== user.id) {
      // member?
      const mem = await supa
        .from("memberships")
        .select("user_id")
        .eq("project_id", fwd)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mem.data) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ project: proj.data });
  }

  // 3) Otherwise ensure by URL origin (one project per owner+origin)
  const rawUrl = sp.get("url");
  if (!rawUrl) return NextResponse.json({ error: "url required" }, { status: 400 });

  let origin = "";
  try {
    const u = new URL(rawUrl);
    origin = u.origin;
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }

  // try to find existing
  const existing = await supa
    .from("projects")
    .select("id,name,origin,owner")
    .eq("owner", user.id)
    .eq("origin", origin)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return NextResponse.json({ project: existing.data });
  }

  // create a new one
  const name = origin.replace(/^https?:\/\//, "");
  const created = await supa
    .from("projects")
    .insert({ name, origin, owner: user.id })
    .select("id,name,origin,owner")
    .single();

  if (created.error) {
    return NextResponse.json({ error: `projects upsert failed: ${created.error.message}` }, { status: 500 });
  }

  return NextResponse.json({ project: created.data });
}
