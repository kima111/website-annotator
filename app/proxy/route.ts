import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { safeParseUrl, absolutize } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  const raw = req.nextUrl.searchParams.get('url') || '';
  const u = safeParseUrl(raw);
  if(!u) return new NextResponse('Bad URL', { status: 400 });

  // Forward common headers so upstream CDNs are happy
  const ua = req.headers.get('user-agent') || undefined;
  const accept = req.headers.get('accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  const acceptLang = req.headers.get('accept-language') || undefined;

  const upstream = await fetch(u.toString(), {
    redirect: 'follow',
    headers: {
      'user-agent': ua ?? 'Mozilla/5.0 (compatible; Annotator/1.0) NextJS',
      'accept': accept,
      'accept-language': acceptLang ?? 'en',
      'referer': u.origin
    }
  });

  const ctype = upstream.headers.get('content-type') || '';
  if(!ctype.includes('text/html')){
    // Non-HTML → bounce through /asset
    return NextResponse.redirect(new URL(`/asset?url=${encodeURIComponent(u.toString())}`, req.url));
  }

  const html = await upstream.text();
  const $ = cheerio.load(html, { decodeEntities: false });

  const base = u.toString();

// helper to build asset URLs that remember the referring page
const asset = (abs: string) => `/asset?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(base)}`;

// Rewrite basic attributes to our proxy
const rewrites: ReadonlyArray<[string, string]> = [
  ['a','href'], ['img','src'], ['script','src'], ['link','href'], ['source','src'], ['iframe','src']
];
for (const [tag, attr] of rewrites) {
  $(tag).each((_, el) => {
    const v = $(el).attr(attr); if (!v) return;
    const abs = absolutize(base, v);
    if (tag === 'a') {
      $(el).attr('href', `/proxy?url=${encodeURIComponent(abs)}`);
    } else {
      $(el).attr(attr, asset(abs));
    }
  });
}

  // Responsive images – rewrite srcset-like attributes
  function rewriteSrcset(tag: string, attr: string) {
    $(tag).each((_, el) => {
      const v = $(el).attr(attr); if (!v) return;
      const parts = v.split(',').map(s => s.trim()).filter(Boolean).map(item => {
        const m = item.match(/^(\S+)(?:\s+(.*))?$/);
        if (!m) return item;
        const abs = absolutize(base, m[1]);
        const desc = m[2] ? ` ${m[2]}` : '';
        return `${asset(abs)}${desc}`;
      });
      $(el).attr(attr, parts.join(', '));
    });
  }
  rewriteSrcset('img','srcset');
  rewriteSrcset('source','srcset');
  rewriteSrcset('img','data-srcset');
  rewriteSrcset('source','data-srcset');

  // Lazy-loading data-* src variants & video posters
  $('img,source').each((_, el) => {
    ['data-src','data-lazy-src','data-original','data-hires'].forEach(a => {
      const v = $(el).attr(a); if (!v) return;
      const abs = absolutize(base, v);
      $(el).attr(a, asset(abs));
    });
  });
  $('video').each((_, el) => {
    const v = $(el).attr('poster'); if (!v) return;
    const abs = absolutize(base, v);
    $(el).attr('poster', asset(abs));
  });

  // Inline CSS: rewrite url(...) tokens too
  $('style').each((_, el) => {
    const t = $(el).html() || '';
    $(el).html(t.replace(/url\(([^)]+)\)/g, (m, g1) => {
      const raw = g1.replace(/["']/g, '').trim();
      const abs = absolutize(base, raw);
      return `url(${asset(abs)})`;
    }));
  });


  // Inline CSS: rewrite url(...) tokens too
  $('style').each((_,el)=>{
    const t = $(el).html() || '';
    $(el).html(t.replace(/url\(([^)]+)\)/g, (m, g1)=>{
      const raw = g1.replace(/["']/g,'').trim();
      const abs = absolutize(base, raw);
      return `url(/asset?url=${encodeURIComponent(abs)})`;
    }));
  });

  // Remove CSP so injected overlay can run
  $('meta[http-equiv="Content-Security-Policy"]').remove();

const projectParam = req.nextUrl.searchParams.get('project') || '';

const boot = `
<script>(function(){
  try {
    // Show a tiny fallback pill immediately (removed by overlay when ready)
    var fb = document.createElement('div');
    fb.id = '__annotator_boot_pill';
    fb.setAttribute('style',
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);' +
      'z-index:2147483647;background:#0b0b0b;color:#fff;padding:8px 12px;' +
      'border-radius:999px;border:1px solid #333;font:600 12px system-ui;pointer-events:auto'
    );
    fb.textContent = 'Annotator loading…';
    (document.body || document.documentElement).appendChild(fb);

    // Pass context to overlay
    window.__ANNOTATOR__ = {
      url: ${JSON.stringify(u.toString())},
      project: ${JSON.stringify(projectParam)}
    };

    function inject(retry){
      var s = document.createElement('script');
      s.src = '/overlay.js' + (retry ? ('?r=' + Date.now()) : '');
      s.type = 'module';
      s.crossOrigin = 'anonymous';
      s.onerror = function(){ console.error('[annotator] overlay load failed'); };
      (document.head || document.documentElement).appendChild(s);
    }
    inject(false);

    // Re-try if not marked ready
    setTimeout(function(){ if(!window.__ANNOTATOR_READY__) inject(true); }, 1500);
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if(window.__ANNOTATOR_READY__ || tries>10){ clearInterval(iv); return; }
      inject(true);
    }, 2000);
  } catch(e){ console.error('[annotator] boot error', e); }
})();<\/script>
`;
$('body').append(boot);



  const out = $.html();
  return new NextResponse(out, {
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'x-annotator-proxied': '1',
    'cache-control': 'no-store',
    // Relax CSP inside the proxied document so the injected script always runs
    "content-security-policy": "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'"
  }
});

}