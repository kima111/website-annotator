'use client';
import { useEffect, useMemo, useState } from 'react';

export default function InvitePage({ params }: any){
  const projectId = params.project;
  const [me, setMe] = useState<any>(null);
  const [status, setStatus] = useState<'idle'|'joining'|'ok'|'err'>('idle');
  const [err, setErr] = useState<string|undefined>();

  const nextHref = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname + window.location.search;
  }, []);

  useEffect(()=>{
    fetch('/api/me', { cache: 'no-store' }).then(async r=>{
      const js = await r.json(); setMe(js.user);
    });
  },[]);

  async function join(){
    setStatus('joining'); setErr(undefined);
    const r = await fetch('/api/projects/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ project_id: projectId })
    });

    if (!r.ok) { const js = await r.json().catch(()=>({})); setErr(js.error || 'Failed to join'); setStatus('err'); return; }
    setStatus('ok');
    // redirect to viewer with the project's origin if possible
  const ensure = await fetch(`/api/projects/ensure?project=${projectId}`, { cache: 'no-store', credentials: 'include' }).then(r=>r.json()).catch(()=>null);
    const origin = ensure?.project?.origin || '';
    const url = origin ? `${origin}/` : 'https://example.com';
    window.location.href = `/annotate/view?url=${encodeURIComponent(url)}&project=${projectId}`;
  }

  if (!me) {
    return (
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Join project</h1>
        <p className="text-neutral-300 mb-4">You need to log in to accept this invite.</p>
        <a className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium" href={`/login?next=${encodeURIComponent(nextHref)}`}>Login</a>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Join project</h1>
      <p className="text-neutral-300 mb-4">Accept to view annotations with your team.</p>
      <button disabled={status==='joining'} onClick={join} className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">
        {status==='joining' ? 'Joining…' : 'Accept Invite'}
      </button>
      {status==='err' && <div className="text-red-400 mt-3 text-sm">{err}</div>}
    </main>
  );
}
