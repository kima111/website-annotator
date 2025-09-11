// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supa = createClient();
  const { data: { user }, error } = await supa.auth.getUser();
  return NextResponse.json({ user, error: error?.message ?? null });
}
