// app/api/projects/ensure/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function normalizeOrigin(raw: string) {
  const u = new URL(raw);
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  return `${u.protocol}//${host}`;
}

function humanNameFromOrigin(origin: string) {
  // origin like "https://example-company.com"
  const host = new URL(origin).hostname.replace(/^www\./i, "");
  const stem = host.split(".")[0] || host;                // "example-company"
  const nice = stem.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return nice || host;                                    // "Example Company"
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  // Must be signed in (read via cookie-aware client)
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("project");
  const url = sp.get("url");
  const supa = admin();

  // If project id provided: allow owner or member, then return it
  if (projectId) {
    const { data: project, error } = await supa
      .from("projects")
      .select("id,name,origin,owner")
      .eq("id", projectId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
    if (!project) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });

    if (project.owner !== user.id) {
      const { data: member } = await supa
        .from("memberships")
        .select("user_id")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
    }

    await supa.from("memberships").upsert(
      { project_id: project.id, user_id: user.id, role: "owner" },
      { onConflict: "project_id,user_id" }
    );

    return NextResponse.json({ project }, { headers: noStore });
  }

  // Ensure by URL
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400, headers: noStore });

  let origin: string;
  try { origin = normalizeOrigin(url); }
  catch { return NextResponse.json({ error: "bad url" }, { status: 400, headers: noStore }); }

  // Name must be non-null due to DB constraint
  const explicitName = (sp.get("name") || "").trim();
  const name = explicitName || humanNameFromOrigin(origin);

  // Upsert (unique index on (owner, origin) recommended)
  const { data: upserted, error } = await supa
    .from("projects")
    .upsert({ owner: user.id, origin, name }, { onConflict: "owner,origin" })
    .select("id,name,origin,owner")
    .single();

  if (error) {
    // If unique index not present yet, fallback to manual get-or-create with non-null name
    if (/on conflict|unique/i.test(error.message)) {
      const { data: existing, error: selErr } = await supa
        .from("projects")
        .select("id,name,origin,owner")
        .eq("owner", user.id)
        .eq("origin", origin)
        .maybeSingle();
      if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500, headers: noStore });

      let project = existing;
      if (!project) {
        const { data: inserted, error: insErr } = await supa
          .from("projects")
          .insert({ owner: user.id, origin, name })
          .select("id,name,origin,owner")
          .single();
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500, headers: noStore });
        project = inserted!;
      }

      await supa.from("memberships").upsert(
        { project_id: project.id, user_id: user.id, role: "owner" },
        { onConflict: "project_id,user_id" }
      );

      return NextResponse.json({ project }, { headers: noStore });
    }

    return NextResponse.json(
      { error: `projects upsert failed: ${error.message}` },
      { status: 500, headers: noStore }
    );
  }

  await supa.from("memberships").upsert(
    { project_id: upserted.id, user_id: user.id, role: "owner" },
    { onConflict: "project_id,user_id" }
  );

  return NextResponse.json({ project: upserted }, { headers: noStore });
}
