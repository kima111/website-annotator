import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { project_id } = await req.json().catch(()=>({}));
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const supa = admin();
  const { data: proj, error: pe } = await supa.from('projects').select('id').eq('id', project_id).maybeSingle();
  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
  if (!proj) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { error } = await supa
    .from('memberships')
    .upsert({ project_id, user_id: user.id, role: 'member' }, { onConflict: 'project_id,user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
