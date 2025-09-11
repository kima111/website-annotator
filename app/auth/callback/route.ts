// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "magiclink" | "recovery" | "invite" | "email_change" | "signup" | null;

  // HTML 200 + JS redirect so Set-Cookie isn't dropped by intermediaries
  const dest = `${url.origin}${next}`;
  const html = `<!doctype html><meta http-equiv="refresh" content="0;url=${dest}"><script>location.replace(${JSON.stringify(dest)})</script>`;
  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  const cookieStore = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
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

  if (code) {
    const { error } = await supa.auth.exchangeCodeForSession(code);
    if (error) console.error(error);
  } else if (token_hash && type) {
    const { error } = await supa.auth.verifyOtp({ token_hash, type });
    if (error) console.error(error);
  }

  return res;
}

