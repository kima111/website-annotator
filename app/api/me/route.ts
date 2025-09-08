import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function GET(){
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if(!user){
    return NextResponse.json({ user: null }, { headers: { 'cache-control': 'no-store' } });
    }
  const { data: profile } = await supa
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();
  const email = (user as any).email ?? profile?.email ?? null;
  return NextResponse.json({ user: { id: user.id, email } }, { headers: { 'cache-control': 'no-store' } });
}