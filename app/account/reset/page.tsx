'use client';
import { useState } from 'react';

export default function ResetPasswordPage(){
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string|undefined>();
  const [err, setErr] = useState<string|undefined>();

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setErr(undefined); setMsg(undefined);
    const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(()=>({}));
    if (!r.ok) setErr(j.error || 'Failed to send reset email'); else setMsg('Email sent (if the account exists).');
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Reset password</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
        <button className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">Send reset link</button>
      </form>
      {msg && <div className="text-green-400 text-sm mt-2">{msg}</div>}
      {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
    </main>
  );
}
