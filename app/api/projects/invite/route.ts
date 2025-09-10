import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { project_id } = await req.json();
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  // Only owners can generate the share link
  const { data: proj, error } = await supa
    .from('projects').select('id, name, origin, share_token, owner')
    .eq('id', project_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (proj.owner !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Build a join URL the user can copy/share (receiver must log in)
  const base = new URL(req.url).origin;
  // We include both project and token; receiver lands on invite page
  const join_url = `${base}/invite/${proj.id}?t=${proj.share_token}`;

  return NextResponse.json({ join_url, project: { id: proj.id, origin: proj.origin, name: proj.name } });
}
