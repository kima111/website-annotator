// app/api/projects/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supa = admin();

  // Require logged-in user (read cookie session)
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projectId = params.id;

  // Load project & verify ownership (owner can delete the project)
  const { data: proj, error: selErr } = await supa
    .from("projects")
    .select("id, owner, name, origin")
    .eq("id", projectId)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!proj) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (proj.owner !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Delete children first (if you don't have ON DELETE CASCADE)
  const { error: delCommentsErr } = await supa
    .from("comments")
    .delete()
    .eq("project_id", projectId);
  if (delCommentsErr)
    return NextResponse.json({ error: delCommentsErr.message }, { status: 500 });

  const { error: delMembersErr } = await supa
    .from("memberships")
    .delete()
    .eq("project_id", projectId);
  if (delMembersErr)
    return NextResponse.json({ error: delMembersErr.message }, { status: 500 });

  // Finally delete project
  const { error: delProjectErr } = await supa
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (delProjectErr)
    return NextResponse.json({ error: delProjectErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
