// lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * IMPORTANT:
 * Do NOT set a global Authorization header here.
 * The SSR adapter will inject the user's access token from cookies automatically.
 * If you set Authorization: '' (empty) it *overrides* the token and breaks RLS.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: any) {
        try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); } catch {}
      },
    },
    // no `global.headers.Authorization` here!
  });
}
