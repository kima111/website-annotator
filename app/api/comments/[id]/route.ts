// app/api/comments/[id]/route.ts
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supa = admin();
  const id = params.id;

  // load comment with project + author
  const { data: row, error: selErr } = await supa
    .from("comments")
    .select("id,project_id,user_id")
    .eq("id", id)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // allow if author or project owner
  if (row.user_id !== user.id) {
    const { data: proj } = await supa
      .from("projects")
      .select("owner")
      .eq("id", row.project_id)
      .maybeSingle();
    if (!proj || proj.owner !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { error: delErr } = await supa.from("comments").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
