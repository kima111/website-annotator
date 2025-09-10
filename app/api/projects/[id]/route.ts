// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const projectId = params.id;

  // Permission: owner or editor of this project
  const { data: owned } = await supa
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner", user.id)
    .maybeSingle();

  let allowed = !!owned;

  if (!allowed) {
    const { data: member } = await supa
      .from("memberships")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .in("role", ["owner", "editor"])
      .maybeSingle();
    allowed = !!member;
  }

  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  // Try child deletes first (in case you don't have ON DELETE CASCADE)
  await supa.from("comments").delete().eq("project_id", projectId);
  await supa.from("memberships").delete().eq("project_id", projectId);

  const { error: delErr } = await supa.from("projects").delete().eq("id", projectId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 403, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
