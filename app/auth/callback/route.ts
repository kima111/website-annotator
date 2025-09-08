import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') || '/';
  const supa = createClient();

  if (code) {
    const { error } = await supa.auth.exchangeCodeForSession(code);
    if (error) {
      const u = new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url);
      return NextResponse.redirect(u);
    }
  }

  const dest = new URL(next, req.url);
  return NextResponse.redirect(dest);
}