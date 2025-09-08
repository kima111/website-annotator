# Pastel-style Web Annotator (Next.js 14 + Supabase)

## Setup
1. `npm i`
2. Create a Supabase project → run SQL in `supabase/` (both files).
3. `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
4. In Supabase Auth → URL Configuration, allow: `http://localhost:3000/auth/callback`
5. `npm run dev` → open `http://localhost:3000`

## Use
- Enter any public URL → Annotate.
- **Drop Pin** to create a note. Pins **stick to elements** (scroll with content).
- Login with magic link to save/load pins (per-URL).

## Notes
- `/proxy` fetches HTML, rewrites links/assets, injects `public/overlay.js`.
- `/asset` proxies assets and **rewrites CSS url(...)** for background images/fonts.
- For snapshots, add `html2canvas` to `public/html2canvas.min.js` or use a CDN.