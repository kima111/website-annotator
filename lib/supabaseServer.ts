// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Read-only client for Server Components (no cookie writes)
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
        // No-ops in RSC to avoid Next's cookie-mutation error
        set(_name: string, _value: string, _options?: CookieOptions) {},
        remove(_name: string, _options?: CookieOptions) {},
      },
    }
  );
}

// Read/write client for Route Handlers / Server Actions
export function createClient<DB = any>() {
  const cookieStore = cookies();
  return createServerClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          // If this is (accidentally) called in a Server Component,
          // Next will throw—swallow it so the page doesn't crash.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // noop outside Route Handlers / Server Actions
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, expires: new Date(0) });
          } catch {
            // noop outside Route Handlers / Server Actions
          }
        },
      },
    }
  );
}