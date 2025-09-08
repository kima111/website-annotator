'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function TopBar(){
  const sp = useSearchParams();
  const url = sp.get('url') || '';
  const initialProject = sp.get('project') || '';
  const router = useRouter();

  const [me, setMe] = useState<{ email?: string } | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(initialProject || undefined);
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  const [err, setErr] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { user: null })
      .then(data => { if(active) setMe(data.user || null); })
      .catch(() => { if(active) setMe(null); });
    return () => { active = false; };
  }, []);

  // Ensure a project for this URL (or use the one in the query)
  useEffect(()=>{
    let cancelled = false;
    async function run(){
      if (!url) return;
      try{
        const endpoint = initialProject
          ? `/api/projects/ensure?project=${encodeURIComponent(initialProject)}`
          : `/api/projects/ensure?url=${encodeURIComponent(url)}`;
        const r = await fetch(endpoint, { cache: 'no-store' });
        if(!r.ok) return;
        const js = await r.json();
        if(!cancelled) setProjectId(js?.project?.id);
      } catch {}
    }
    run();
    return ()=>{ cancelled = true; };
  }, [url, initialProject]);

  const loginHref = useMemo(() => {
    if (typeof window === 'undefined') return '/login';
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    return `/login?next=${next}`;
  }, []);

  const onOpen = useCallback((e: React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const t = (e.currentTarget.elements.namedItem('u') as HTMLInputElement);
    const nextUrl = t?.value || '';
    if (!nextUrl) return;
    const qp = new URLSearchParams({ url: nextUrl });
    if (projectId) qp.set('project', projectId);
    router.push(`/annotate/view?${qp.toString()}`);
  }, [router, projectId]);

  const createShare = useCallback(async ()=>{
    try{
      setErr(undefined); setShareUrl(undefined);
      if (!projectId) {
        // ensure we have one (e.g., user clicked share too quickly)
        const endpoint = url
          ? `/api/projects/ensure?url=${encodeURIComponent(url)}`
          : undefined;
        if (endpoint) {
          const r = await fetch(endpoint, { cache: 'no-store' });
          if (r.ok) {
            const js = await r.json();
            setProjectId(js?.project?.id);
          }
        }
      }
      if (!projectId) { setErr('No project for this URL yet. Try again.'); return; }
      const r = await fetch('/api/projects/invite', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });
      if(!r.ok){
        const j = await r.json().catch(()=>({}));
        setErr(j.error || 'Unable to create invite. Are you logged in and owner?');
        return;
      }
      const js = await r.json();
      setShareUrl(js.join_url);
    } catch(e:any){
      setErr(e?.message || 'Share failed');
    }
  }, [projectId, url]);

  return (
    <div className="sticky top-0 z-50 w-full bg-neutral-900/70 backdrop-blur border-b border-neutral-800">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 p-2">
        <div className="font-bold tracking-wide">Annotator</div>
        <form className="flex-1 flex gap-2" onSubmit={onOpen}>
          <input name="u" defaultValue={url} placeholder="https://example.com" className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
          <button className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">Open</button>
        </form>
        <button disabled={!projectId} onClick={createShare} className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-200">
          Share
        </button>
        {shareUrl && (
          <input readOnly value={shareUrl} className="w-[360px] max-w-[40vw] bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300" onFocus={(e)=>e.currentTarget.select()} />
        )}
        {err && <div className="text-red-400 text-xs">{err}</div>}
        {me ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-300" title={me.email}>{me.email}</span>
            <a href="/logout" className="text-neutral-400 hover:text-neutral-200">Logout</a>
          </div>
        ) : (
          <a href={loginHref} className="text-neutral-400 hover:text-neutral-200 text-sm">Login</a>
        )}
        <a href="/" className="text-neutral-400 hover:text-neutral-200 text-sm">Home</a>
      </div>
    </div>
  );
}
