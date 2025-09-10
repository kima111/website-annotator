import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let target: URL;
  try { target = new URL(url); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }

  const upstream = await fetch(target.toString(), {
    headers: {
      referer: req.nextUrl.searchParams.get("ref") || "",
      "user-agent": req.headers.get("user-agent") || "Mozilla/5.0",
    },
    redirect: "follow",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set("Cache-Control", "private, max-age=60");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
