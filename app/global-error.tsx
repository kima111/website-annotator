'use client';
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }){
  return (
    <html>
      <body>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b0b0b', color: '#eee' }}>
          <div style={{ maxWidth: 480, width: '100%', border: '1px solid #333', borderRadius: 12, padding: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>App crashed</h1>
            <p style={{ opacity: 0.7, marginBottom: 12 }}>{error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => reset()} style={{ background:'#38bdf8', color:'#000', border:'none', borderRadius:8, padding:'8px 12px', fontWeight:700 }}>Reload</button>
          </div>
        </main>
      </body>
    </html>
  );
}
