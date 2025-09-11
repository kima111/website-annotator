// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Read-only client for Server Components (avoid cookie writes)
export function createClientRSC<DB = any>() {
  const cookieStore = cookies();
  return createServerClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

// Writeable client for Route Handlers / Server Actions
export function createClient<DB = any>() {
  const cookieStore = cookies();
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
  return createServerClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            const o = { ...(options||{}), ...(cookieDomain ? { domain: cookieDomain } : {}) } as CookieOptions;
            cookieStore.set({ name, value, ...o });
          } catch {}
        },
        remove(name: string, options?: CookieOptions) {
          try {
            const o = { ...(options||{}), ...(cookieDomain ? { domain: cookieDomain } : {}) } as CookieOptions;
            cookieStore.set({ name, value: "", ...o, expires: new Date(0) });
          } catch {}
        },
      },
    }
  );
}
