// middleware.ts — minimal pass-through to avoid Edge runtime issues
import { NextResponse, NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return req.cookies.get(name)?.value; },
          set(name: string, value: string, options?: CookieOptions) { res.cookies.set({ name, value, ...(options||{}) }); },
          remove(name: string, options?: CookieOptions) { res.cookies.set({ name, value: "", ...(options||{}), expires: new Date(0) }); },
        },
      }
    );
    await supabase.auth.getSession();
  } catch {}
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
