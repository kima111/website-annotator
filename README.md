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

## Environment Variables
Configure these in Vercel → Settings → Environment Variables.

Required
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (e.g., `https://xxx.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-only secret).

Recommended
- `CANONICAL_HOST`: Production hostname (no scheme), e.g., `website-annotator.vercel.app` or `yourdomain.com`.
- `AUTH_COOKIE_DOMAIN`: Cookie domain for Supabase auth cookies.
	- Vercel default domain: `website-annotator.vercel.app`
	- Custom domain apex+www: `.yourdomain.com`
	- Preview deployments: leave unset (cookies remain host-scoped).
- `NEXT_PUBLIC_BASE_URL`: Full base URL (no trailing slash), e.g., `https://website-annotator.vercel.app`.

Supabase Auth → URL Configuration
- Site URL: `https://<CANONICAL_HOST>/`
- Redirect URLs: `https://<CANONICAL_HOST>/auth/callback`

Preview Deployments
- Do not set `AUTH_COOKIE_DOMAIN` on previews; cookies should be host-scoped.
- Avoid cross-host redirects during auth; middleware already skips `/auth`, `/api`, `/annotate`.