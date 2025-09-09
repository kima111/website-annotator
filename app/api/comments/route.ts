// app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest){
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get('project_id') || undefined;
  const url = req.nextUrl.searchParams.get('url') || undefined;

  let q = supa.from('comments').select('*');
  if (projectId) q = q.eq('project_id', projectId); else q = q.eq('user_id', user.id);
  if (url) q = q.eq('url', url);

  const { data, error } = await q.order('created_at', { ascending: false });
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest){
  const payload = await req.json();
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await supa.from('profiles').upsert({ id: user.id, email: (user as any).email ?? null });
  if (!payload.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const row = {
    id: payload.id,
    user_id: user.id,
    project_id: payload.project_id,
    url: payload.url,
    selector: payload.selector,
    x: payload.x, y: payload.y,
    bbox: payload.bbox,
    comment: payload.comment || '',
    status: payload.status || 'open',
    image: payload.image || null
  };

  const { error } = await supa.from('comments').upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await supa.from('activity').insert({ user_id: user.id, type: 'save_comment', url: row.url, meta: { project_id: row.project_id, id: row.id } });
  return NextResponse.json({ ok: true });
}
