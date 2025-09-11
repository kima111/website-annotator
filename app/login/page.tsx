'use client';
import { useMemo, useState } from 'react';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const nextParam = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('next') || '/';
  }, []);

  async function onSignin(e: React.FormEvent){
    e.preventDefault();
    setErr(null); setBusy(true);
    try{
      const r = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(()=>({}));
        setErr(j.error || 'Login failed');
        return;
      }
      window.location.href = nextParam;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form className="space-y-3" onSubmit={onSignin}>
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
        <button disabled={busy} className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
      <div className="text-sm text-neutral-400 mt-4">
        No account? <a className="underline" href={`/signup?next=${encodeURIComponent(nextParam)}`}>Sign up</a> · <a className="underline" href="/account/reset">Reset password</a>
      </div>
    </main>
  );
}