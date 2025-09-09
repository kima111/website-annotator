// app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStore = { 'Cache-Control': 'no-store, max-age=0' };

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: noStore });
  }

  const { error } = await supa.from('comments').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}


export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const body = await req.json();
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if(!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { error } = await supa.from('comments').update(body).eq('id', params.id).eq('user_id', user.id);
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supa.from('activity').insert({ user_id: user.id, type: 'update_comment', meta: { id: params.id, body } });
  return NextResponse.json({ ok: true });
}