// middleware.ts — minimal pass-through to avoid Edge runtime issues
import { NextResponse, NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Always continue the request
  const res = NextResponse.next();

  // Refresh the Supabase session on every request so SSR sees it
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set({ name, value, ...(options || {}) });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set({ name, value: "", ...(options || {}), expires: new Date(0) });
        },
      },
    }
  );

  await supabase.auth.getSession().catch(() => null);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
