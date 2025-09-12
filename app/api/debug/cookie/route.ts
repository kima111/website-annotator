import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "set";
  const next = "/api/debug/auth";
  const res = NextResponse.redirect(new URL(next, url.origin), 302);
  const isProd = process.env.NODE_ENV === "production";
  if (mode === "clear") {
    res.cookies.set({ name: "__cookie_test__", value: "", path: "/", httpOnly: true, secure: isProd, sameSite: "lax", expires: new Date(0) });
  } else {
    res.cookies.set({ name: "__cookie_test__", value: String(Date.now()), path: "/", httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 60 * 60 });
  }
  return res;
}
