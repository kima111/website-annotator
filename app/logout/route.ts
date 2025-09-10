// app/logout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // ensure cookie writes

export async function GET(request: Request) {
  const supa = createClient();       // server (writeable) client
  await supa.auth.signOut();         // clears the session cookie
  const url = new URL(request.url);  // <-- use the incoming origin
  return NextResponse.redirect(`${url.origin}/`);
}
