import { NextRequest, NextResponse } from 'next/server';
import { safeParseUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

function guessAccept(u: URL) {
  const p = u.pathname.toLowerCase();
  if (p.endsWith('.svg'))  return 'image/svg+xml,image/*;q=0.9,*/*;q=0.8';
  if (p.endsWith('.png'))  return 'image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg'))
                           return 'image/avif,image/webp,image/jpeg,image/*;q=0.8,*/*;q=0.5';
  if (p.endsWith('.webp')) return 'image/avif,image/webp,image/*;q=0.8,*/*;q=0.5';
  if (p.endsWith('.gif'))  return 'image/gif,image/*;q=0.8,*/*;q=0.5';
  if (p.endsWith('.css'))  return 'text/css,*/*;q=0.1';
  return '*/*';
}

export async function GET(req: NextRequest){
  const u = req.nextUrl.searchParams.get('url') || '';
  const ref = req.nextUrl.searchParams.get('ref') || '';
  const url = safeParseUrl(u);
  const refUrl = safeParseUrl(ref);
  if (!url) return new NextResponse('Bad URL', { status: 400 });

  // Prefer the original page as Referer (some CDNs require a full-page referer, not just origin)
  const referer = refUrl?.toString() || url.origin;

  const ua = req.headers.get('user-agent') || undefined;
  const accept = req.headers.get('accept') || guessAccept(url);
  const acceptLang = req.headers.get('accept-language') || 'en';

  // ...inside GET(req: NextRequest) in app/asset/route.ts

  const upstream = await fetch(url.toString(), {
    redirect: 'follow',
    headers: {
      'user-agent': ua ?? 'Mozilla/5.0 (compatible; Annotator/1.0) NextJS',
      'accept': accept,
      'accept-language': acceptLang,
      'referer': referer,
      'origin': (refUrl ?? url).origin,
      // NEW: avoid compressed responses (prevents double-decode mismatch)
      'accept-encoding': 'identity'
    }
  });

  const headers: Record<string,string> = {};
  const drop = new Set([
    'content-security-policy',
    'x-frame-options',
    'cross-origin-resource-policy',
    // NEW: strip compression/length headers (fixes ERR_CONTENT_DECODING_FAILED)
    'content-encoding',
    'transfer-encoding',
    'content-length',
  ]);
  upstream.headers.forEach((v,k)=>{ if(!drop.has(k.toLowerCase())) headers[k]=v; });

  // (rest of your content-type handling stays the same)
  // For CSS/SVG branches you already set content-type; that's fine.
  // For the default pass-through, it's safe to add no-store:
  // return new NextResponse(upstream.body, { status: upstream.status, headers: { ...headers, 'cache-control': 'no-store' } });


  const ctype = upstream.headers.get('content-type') || '';

  // CSS: rewrite url(...) and @import
  if (ctype.includes('text/css')) {
    const cssText = await upstream.text();
    let rewritten = cssText.replace(/url\(([^)]+)\)/g, (m, g1) => {
      const raw = g1.replace(/["']/g, '').trim();
      try {
        const abs = new URL(raw, url.toString()).toString();
        // carry the original page as ref
        return `url(/asset?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)})`;
      } catch { return m; }
    });
    rewritten = rewritten.replace(/@import\s+(?:url\(([^)]+)\)|"([^"]+)"|'([^']+)')/g, (m, u1, u2, u3) => {
      const raw = (u1||u2||u3||'').replace(/["']/g, '').trim();
      try {
        const abs = new URL(raw, url.toString()).toString();
        return `@import url(/asset?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)})`;
      } catch { return m; }
    });
    headers['content-type'] = 'text/css; charset=utf-8';
    headers['cache-control'] = 'no-store';
    return new NextResponse(rewritten, { status: upstream.status, headers });
  }

  // SVG: also rewrite internal href/xlink:href and style url(...)
  if (ctype.includes('image/svg')) {
    const txt = await upstream.text();
    const rewritten = txt
      .replace(/(xlink:href|href)=(\"|')([^\"']+)\2/g, (m, attr, q, val) => {
        try {
          const abs = new URL(val, url.toString()).toString();
          return `${attr}=${q}/asset?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}${q}`;
        } catch { return m; }
      })
      .replace(/url\(([^)]+)\)/g, (m, g1) => {
        const raw = g1.replace(/["']/g, '').trim();
        try {
          const abs = new URL(raw, url.toString()).toString();
          return `url(/asset?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)})`;
        } catch { return m; }
      });
    headers['content-type'] = 'image/svg+xml; charset=utf-8';
    headers['cache-control'] = 'no-store';
    return new NextResponse(rewritten, { status: upstream.status, headers });
  }

  // Default: stream through
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
