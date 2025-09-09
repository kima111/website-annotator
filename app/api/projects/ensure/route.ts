// app/api/projects/ensure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function originOf(raw: string) {
  try { const u = new URL(raw); return `${u.protocol}//${u.hostname}`; }
  catch { return null; }
}

export async function GET(req: NextRequest) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const urlParam = req.nextUrl.searchParams.get('url') || '';
  const projectParam = req.nextUrl.searchParams.get('project') || '';
  const origin = urlParam ? originOf(urlParam) : null;

  try {
    if (projectParam) {
      const { data: proj, error } = await supa
        .from('projects')
        .select('id,name,origin,share_token,owner')
        .eq('id', projectParam)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 403 });

      const role = proj.owner === user.id ? 'owner' : 'viewer';
      await supa.from('memberships').upsert({ project_id: proj.id, user_id: user.id, role });

      return NextResponse.json({ project: { id: proj.id, name: proj.name, origin: proj.origin, share_token: proj.share_token } });
    }

    if (!origin) return NextResponse.json({ error: 'bad url' }, { status: 400 });

    const { data: existing, error: selErr } = await supa
      .from('projects')
      .select('id,name,origin,share_token')
      .eq('owner', user.id)
      .eq('origin', origin)
      .maybeSingle();

    if (selErr?.message) return NextResponse.json({ error: selErr.message }, { status: 403 });

    if (existing) {
      await supa.from('memberships').upsert({ project_id: existing.id, user_id: user.id, role: 'owner' });
      return NextResponse.json({ project: existing });
    }

    const name = new URL(origin).hostname;
    const { data: created, error: insErr } = await supa
      .from('projects')
      .insert({ owner: user.id, name, origin })
      .select('id,name,origin,share_token')
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 403 });

    await supa.from('memberships').upsert({ project_id: created.id, user_id: user.id, role: 'owner' });
    return NextResponse.json({ project: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal error' }, { status: 500 });
  }
}
