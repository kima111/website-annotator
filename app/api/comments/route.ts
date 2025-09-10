// app/api/comments/route.ts
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

async function assertAccess(supa: ReturnType<typeof admin>, userId: string, projectId: string) {
  const { data: proj, error } = await supa
    .from("projects")
    .select("id, owner")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!proj) return { ok: false, status: 404, msg: "project not found" };
  if (proj.owner === userId) return { ok: true };

  const { data: mem } = await supa
    .from("memberships")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!mem) return { ok: false, status: 403, msg: "forbidden" };
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("project_id");
  const url = sp.get("url"); // optional: page-level filter

  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const supa = admin();
  const access = await assertAccess(supa, user.id, projectId);
  if (!access.ok) return NextResponse.json({ error: access.msg }, { status: access.status! });

  let query = supa
    .from("comments")
    .select("id,project_id,user_id,selector,x,y,bbox,comment,status,image,url,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (url) query = query.eq("url", url);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const userClient = createClient();
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.project_id) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  const supa = admin();
  const access = await assertAccess(supa, user.id, body.project_id);
  if (!access.ok) return NextResponse.json({ error: access.msg }, { status: access.status! });

  const payload = {
    id: body.id, // allow client id for idempotency
    project_id: body.project_id,
    user_id: user.id,
    selector: body.selector ?? "",
    x: body.x ?? null,
    y: body.y ?? null,
    bbox: body.bbox ?? null,
    comment: body.comment ?? "",
    status: body.status ?? "open",
    image: body.image ?? null,
    url: body.url ?? null,
  };

  const { data, error } = await supa
    .from("comments")
    .upsert(payload, { onConflict: "id" })
    .select("id,project_id,user_id,selector,x,y,bbox,comment,status,image,url,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
