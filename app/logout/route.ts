import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = `${url.origin}/`;
  const html = `<!doctype html><meta http-equiv="refresh" content="0;url=${dest}"><script>location.replace(${JSON.stringify(dest)})</script>`;
  const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const jar = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return jar.get(name)?.value; },
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

  await supa.auth.signOut();
  return res;
}
