// middleware.ts
import { NextResponse, NextRequest } from "next/server";
const CANONICAL = "website-annotator.vercel.app";
export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  if (process.env.VERCEL_ENV === "production" && host && host !== CANONICAL) {
    const url = new URL(req.url); url.host = CANONICAL;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
