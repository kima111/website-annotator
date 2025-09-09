// app/asset/route.ts
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const ref = req.nextUrl.searchParams.get('ref') || undefined;
  if (!url) return new Response('missing url', { status: 400 });

  const u = new URL(url);
  const accept = guessAccept(u);

  const res = await fetch(u, {
    redirect: 'follow',
    headers: {
      'accept': accept,
      'accept-encoding': 'identity',      // avoid double-compressed responses
      'referer': ref || `${u.protocol}//${u.host}/`,
      'user-agent': 'Mozilla/5.0 Annotator',
    },
  });

  // Copy headers but drop encoding/length to prevent decoding errors
  const h = new Headers(res.headers);
  ['content-encoding', 'transfer-encoding', 'content-length'].forEach(k => h.delete(k));

  return new Response(res.body, { status: res.status, headers: h });
}
