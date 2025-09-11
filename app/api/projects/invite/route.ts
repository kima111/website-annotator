// app/api/projects/invite/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// Local row shape (keeps this route independent of your generated types)
type ProjectRow = {
  id: string;
  owner: string;
  name?: string | null;
  origin?: string | null;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUser() {
  const userClient = createClient(); // Route Handler can read/write cookies
  const { data: auth } = await userClient.auth.getUser();
  return auth?.user ?? null;
}

function makeInviteUrl(req: NextRequest, projectId: string) {
  const base = new URL(req.url).origin;
  return `${base}/invite/${encodeURIComponent(projectId)}`;
}

async function ensureOwnerOrMember(projectId: string, userId: string) {
  const supa = admin();

  // Load project (owner check)
  const projRes = await supa
    .from("projects")
    .select("id, owner, name, origin")
    .eq("id", projectId)
    .maybeSingle();

  if (projRes.error) {
    return { ok: false as const, status: 404, msg: projRes.error.message };
  }
  if (!projRes.data) {
    return { ok: false as const, status: 404, msg: "not found" };
  }

  const proj = projRes.data as ProjectRow;

  if (proj.owner === userId) {
    return { ok: true as const, project: proj };
  }

  // If you want to allow only owners to create invites, return forbidden here:
  // return { ok: false as const, status: 403, msg: "forbidden" };

  // Otherwise, allow members to generate an invite link too:
  const memRes = await supa
    .from("memberships")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memRes.error) {
    return { ok: false as const, status: 500, msg: memRes.error.message };
  }
  if (!memRes.data) {
    return { ok: false as const, status: 403, msg: "forbidden" };
  }

  return { ok: true as const, project: proj };
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return NextResponse.json({ error: "project required" }, { status: 400 });

  const access = await ensureOwnerOrMember(projectId, user.id);
  if (!access.ok) return NextResponse.json({ error: access.msg }, { status: access.status });

  const invite_url = makeInviteUrl(req, projectId);
  return NextResponse.json({ invite_url });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const projectId = (body?.project_id ?? body?.project) as string | undefined;
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

  const access = await ensureOwnerOrMember(projectId, user.id);
  if (!access.ok) return NextResponse.json({ error: access.msg }, { status: access.status });

  const invite_url = makeInviteUrl(req, projectId);
  return NextResponse.json({ invite_url });
}
