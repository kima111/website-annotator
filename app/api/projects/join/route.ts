import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { project_id, token } = await req.json();
  if (!project_id || !token) return NextResponse.json({ error: 'project_id and token required' }, { status: 400 });

  // secure join via RPC (security definer)
  const { error } = await supa.rpc('join_project_with_token', { p_project: project_id, p_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
