// app/api/projects/list/route.ts
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

export async function GET(_req: NextRequest) {
  // Must be logged in (session from cookies)
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supa = admin();

  // 1) Owned projects (no updated_at)
  const owned = await supa
    .from("projects")
    .select("id,name,origin,created_at,owner")
    .eq("owner", user.id);

  if (owned.error) {
    return NextResponse.json({ error: owned.error.message }, { status: 500 });
  }

  // 2) Member projects
  const member = await supa
    .from("memberships")
    .select("project_id")
    .eq("user_id", user.id);

  const memberIds = (member.data ?? []).map((m) => m.project_id).filter(Boolean);
  let memberRows: any[] = [];
  if (memberIds.length) {
    const r = await supa
      .from("projects")
      .select("id,name,origin,created_at,owner")
      .in("id", memberIds);
    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
    memberRows = r.data ?? [];
  }

  // 3) Merge & de-dup
  const byId = new Map<string, any>();
  for (const p of (owned.data ?? [])) byId.set(p.id, p);
  for (const p of memberRows) if (!byId.has(p.id)) byId.set(p.id, p);
  const projects = Array.from(byId.values());

  // 4) Attach last_url & last_activity (latest comment time or project.created_at)
  const ids = projects.map((p) => p.id);
  const lastUrl = new Map<string, string | null>();
  const lastCommentAt = new Map<string, string | null>();

  if (ids.length) {
    const rc = await supa
      .from("comments")
      .select("project_id,url,created_at")
      .in("project_id", ids)
      .order("created_at", { ascending: false });

    if (!rc.error) {
      for (const row of rc.data ?? []) {
        // first time we see a project_id = latest comment (because of order desc)
        if (!lastUrl.has(row.project_id)) {
          lastUrl.set(row.project_id, row.url ?? null);
          lastCommentAt.set(row.project_id, row.created_at ?? null);
        }
      }
    }
  }

  const enriched = projects
    .map((p) => {
      const last = lastCommentAt.get(p.id);
      const activity = last ?? p.created_at ?? null;
      return {
        ...p,
        last_url: lastUrl.get(p.id) ?? null,
        last_activity: activity, // ISO string or null
      };
    })
    .sort((a, b) => {
      const ta = a.last_activity ? Date.parse(a.last_activity) : (a.created_at ? Date.parse(a.created_at) : 0);
      const tb = b.last_activity ? Date.parse(b.last_activity) : (b.created_at ? Date.parse(b.created_at) : 0);
      return tb - ta;
    });

  return NextResponse.json({ projects: enriched });
}
