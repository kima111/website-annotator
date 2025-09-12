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
          set(name: string, value: string, options?: CookieOptions) {
            const isProd = process.env.NODE_ENV === "production";
            res.cookies.set({ name, value, ...(options||{}), path: "/", sameSite: "lax", secure: isProd });
          },
          remove(name: string, options?: CookieOptions) {
            const isProd = process.env.NODE_ENV === "production";
            res.cookies.set({ name, value: "", ...(options||{}), path: "/", sameSite: "lax", secure: isProd, expires: new Date(0) });
          },
        },
      }
    );
    await supabase.auth.getSession();
  } catch {}
  return res;
}

export const config = {
  matcher: [
    // run on everything except static assets, auth endpoints, and callback/logout
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|logout|api/auth/.*).*)",
  ],
};
