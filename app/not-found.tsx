import Link from 'next/link';

export default function NotFound(){
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-md w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center text-neutral-200">
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-neutral-400 mb-4">The page you’re looking for doesn’t exist.</p>
        <Link href="/" className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400">Go home</Link>
      </div>
    </main>
  );
}
