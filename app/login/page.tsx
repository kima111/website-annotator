'use client';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const nextParam = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('next') || '/';
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirect = `${origin}/auth/callback?next=${encodeURIComponent(nextParam)}`;
    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect }
    });
    if(error) setErr(error.message); else setSent(true);
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {sent ? (
        <div className="text-sm text-neutral-300">Check your email for a magic link.</div>
      ) : (
        <form className="space-y-3" onSubmit={onSubmit}>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
          <button className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">Send magic link</button>
          {err && <div className="text-red-400 text-sm">{err}</div>}
        </form>
      )}
    </main>
  );
}