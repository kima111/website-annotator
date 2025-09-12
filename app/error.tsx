'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }){
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-md w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center text-neutral-200">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        {error?.message && <p className="text-neutral-400 mb-4">{error.message}</p>}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => reset()} className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400">Try again</button>
          <Link href="/" className="inline-flex items-center rounded-lg px-3 py-2 font-semibold border border-neutral-700 hover:bg-neutral-900">Home</Link>
        </div>
      </div>
    </main>
  );
}
