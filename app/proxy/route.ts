// app/proxy/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs"; // avoid Edge runtime stream/encoding issues

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "url required" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "user-agent":
          req.headers.get("user-agent") ??
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": req.headers.get("accept-language") ?? "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const ct = upstream.headers.get("content-type") || "";

    // Non-HTML: stream through like /asset
    if (!ct.toLowerCase().includes("text/html")) {
      const h = new Headers(upstream.headers);
      h.delete("content-encoding");
      h.delete("content-length");
      h.delete("transfer-encoding");
      h.set("Cache-Control", "private, max-age=60");
      return new NextResponse(upstream.body, { status: upstream.status, headers: h });
    }

    // HTML: rewrite and inject patch
    const html = await upstream.text();
    const rewritten = rewriteHtml(html, target);
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `proxy fetch failed: ${e?.message || String(e)}` },
      { status: 502 }
    );
  }
}

/* ---------------- helpers ---------------- */

function abs(u: string, base: string) {
  try {
    return new URL(u, base).href;
  } catch {
    return u;
  }
}

function unwrapRemoteAsset(u: string, baseOrigin: string) {
  // If upstream already has /asset?url=..., unwrap inner url to avoid double-wrapping
  try {
    const parsed = new URL(u);
    if (parsed.origin === baseOrigin && parsed.pathname === "/asset") {
      const inner = parsed.searchParams.get("url");
      if (inner) return new URL(inner, baseOrigin).href;
    }
  } catch {}
  return u;
}

function toAsset(u: string, ref: string) {
  return `/asset?url=${encodeURIComponent(u)}&ref=${encodeURIComponent(ref)}`;
}

function rewriteSrcset(value: string, base: string, baseOrigin: string, refUrl: string) {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const [u, ...rest] = trimmed.split(/\s+/);
      const a = abs(u, base);
      const unwrapped = unwrapRemoteAsset(a, baseOrigin);
      const prox = toAsset(unwrapped, refUrl);
      return [prox, ...rest].join(" ");
    })
    .join(", ");
}

function rewriteHtml(html: string, target: URL) {
  const pageUrl = target.toString();
  const origin = `${target.protocol}//${target.host}`;
  const base = `${origin}${target.pathname}`;
  const baseOrigin = origin;

  // inside rewriteHtml(), build `patch` like this:
const patch = `
<base href="${origin}/">
<script>(function(){
  var ORIGIN=${JSON.stringify(origin)};
  var REF=${JSON.stringify(pageUrl)};
  function abs(u){ try { return new URL(u, ORIGIN).href; } catch { return u; } }
  function prox(u){ return '/asset?url=' + encodeURIComponent(u) + '&ref=' + encodeURIComponent(REF); }

  // helper: detect overlay/annotator-tagged requests
  function hasAnnotatorHeader(input, init){
    try{
      var headers = (init && init.headers) || (input && input.headers) || null;
      if (!headers) return false;
      if (typeof headers.get === 'function') return !!headers.get('x-annotator');
      if (typeof headers === 'object'){
        for (var k in headers){ if (k && k.toLowerCase() === 'x-annotator') return true; }
      }
    }catch(e){}
    return false;
  }

  // fetch proxy
  var _fetch = window.fetch;
  window.fetch = function(input, init){
    try{
      if (hasAnnotatorHeader(input, init)) {
        // let overlay/API calls go straight to our app
        return _fetch(input, init);
      }
      var u = (typeof input === 'string') ? input : input.url;
      var a = abs(u);
      return _fetch(prox(a), init);
    }catch(e){
      return _fetch(input, init);
    }
  };

  // XHR proxy (ok to leave as-is; overlay uses fetch)
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    try{
      var a = abs(url);
      return _open.apply(this, [method, prox(a)]);
    }catch(e){
      return _open.apply(this, arguments);
    }
  };
})();</script>`.trim();


  let out = html;
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, (m, g1) => `<head${g1}>${patch}`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, (m, g1) => `<html${g1}><head>${patch}</head>`);
  } else {
    out = `${patch}\n${out}`;
  }

  // Rewrite src/href to /asset
  out = out.replace(/\s(?:src|href)=["']([^"']+)["']/gi, (m, u) => {
    if (/^(data:|javascript:|#)/i.test(u)) return m;
    const a = abs(u, base);
    const unwrapped = unwrapRemoteAsset(a, baseOrigin);
    return m.replace(u, toAsset(unwrapped, pageUrl));
  });

  // Rewrite srcset too
  out = out.replace(/\s(srcset)=["']([^"']+)["']/gi, (_m, attr, val) => {
    return ` ${attr}="${rewriteSrcset(val, base, baseOrigin, pageUrl)}"`;
  });

  return out;
}
