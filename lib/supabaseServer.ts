// lib/supabaseServer.ts
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase server client that reads auth tokens from request cookies.
// Safe on Node + Edge; write attempts are no-ops when not allowed.
export function createClient() {
  const cookieStore = cookies();
  const hdrs = headers();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // In Route Handlers, cookie jar can be read-only. Swallow errors.
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: any) {
        try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); } catch {}
      },
    },
    global: {
      // Forward Authorization if present (not required, but helps with CLI / test calls)
      headers: {
        Authorization: hdrs.get('authorization') ?? '',
        'X-Client-Info': 'annotator/1.0',
      },
    },
  });
}
