// app/api/projects/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, max-age=0" };

function normalizeOrigin(raw: string) {
  const u = new URL(raw);
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  return `${u.protocol}//${host}`; // e.g. https://example.com
}

export async function GET(req: NextRequest) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("project");
  const url = sp.get("url");

  // 1) direct by project id (validate access)
  if (projectId) {
    const { data: project, error } = await supa
      .from("projects")
      .select("id, name, origin, owner")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !project) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });

    // optional: ensure membership exists for current user
    await supa.from("memberships").upsert(
      { project_id: project.id, user_id: user.id, role: "owner" },
      { onConflict: "project_id,user_id" }
    );

    return NextResponse.json({ project }, { headers: noStore });
  }

  // 2) by URL (ensure one project per owner+origin)
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400, headers: noStore });

  let origin: string;
  try { origin = normalizeOrigin(url); } catch { return NextResponse.json({ error: "bad url" }, { status: 400, headers: noStore }); }

  // UPSERT: requires unique index on (owner, origin)
  const { data: project, error } = await supa
    .from("projects")
    .upsert(
      { owner: user.id, origin, name: null },
      { onConflict: "owner,origin" }
    )
    .select("id, name, origin, owner")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403, headers: noStore });

  // ensure membership exists
  await supa.from("memberships").upsert(
    { project_id: project.id, user_id: user.id, role: "owner" },
    { onConflict: "project_id,user_id" }
  );

  return NextResponse.json({ project }, { headers: noStore });
}
