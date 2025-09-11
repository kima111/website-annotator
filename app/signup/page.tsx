'use client';
import { useMemo, useState } from 'react';

export default function SignupPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState(false);

  const nextParam = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('next') || '/';
  }, []);

  async function onSignup(e: React.FormEvent){
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    setBusy(true);
    try{
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { setErr(j.error || 'Signup failed'); return; }
      setOk(true);
      setTimeout(()=>{ window.location.href = nextParam; }, 800);
    } finally { setBusy(false); }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create account</h1>
      {ok ? (
        <div className="text-sm text-neutral-300">Check your inbox to confirm your email, then continue.</div>
      ) : (
        <form className="space-y-3" onSubmit={onSignup}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
          <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a password" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
          <input type="password" required minLength={6} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
          <button disabled={busy} className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">{busy ? 'Creating…' : 'Sign up'}</button>
        </form>
      )}
      {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
      <div className="text-sm text-neutral-400 mt-4">Have an account? <a className="underline" href={`/login?next=${encodeURIComponent(nextParam)}`}>Sign in</a></div>
    </main>
  );
}
