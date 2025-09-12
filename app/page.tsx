// app/page.tsx
import Link from "next/link";
import { headers as nextHeaders, cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Project = {
  id: string;
  name: string | null;
  origin: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getBaseUrl() {
  // Prefer env for prod; fall back to current request’s host in dev
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = nextHeaders();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchProjectsSSR(): Promise<Project[]> {
  const base = getBaseUrl();

  // Build Cookie header from the current request’s cookies
  const cookieHeader = cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${base}/api/projects/list`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      // forward auth cookies so /api/projects/list sees your session
      cookie: cookieHeader,
    },
  }).catch(() => null as any);

  if (!res || !res.ok) return [];
  const js = (await res.json().catch(() => null)) as { projects?: Project[] } | null;
  return js?.projects ?? [];
}

export default async function Home() {
  // still read user for the header UI
  const supa = createClient();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;

  const projects = user ? await fetchProjectsSSR() : [];

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-center pb-8">
        No-install Website Markup
      </h1>

      <p className="text-neutral-300 mb-6">
        Open any public URL, drop pins, discuss, and export actionable changes — without adding a script to the target site.
      </p>

      <p className="text-neutral-400 mb-6 text-xs">
        To get started, enter a Fully Qualified Domain Name / URL below e.g. https://www.example.com
      </p>

      {/* Start new annotation session */}
      <form action="/annotate/view" method="get" className="flex gap-2">
        <input
          name="url"
          placeholder="https://example.com"
          className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"
        />
        <button className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">
          Annotate
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        {!user ? (
          <>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400"
            >
              Log in
            </Link>
            <Link
              href="/signup" // CHANGED: go to the dedicated signup page
              className="inline-flex items-center rounded-lg px-3 py-2 font-semibold border border-neutral-700 hover:bg-neutral-900"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            <span className="text-xs text-neutral-500">
              Signed in as <span className="font-mono">{user.email}</span>
            </span>
            <Link
              href="/logout"
              className="inline-flex items-center rounded-lg px-3 py-2 font-semibold border border-neutral-700 hover:bg-neutral-900"
            >
              Log out
            </Link>
          </>
        )}
      </div>

      {/* Past projects when signed in */}
      {user && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Your projects</h2>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 p-6 bg-neutral-950 text-neutral-400 text-sm">
              No projects yet. Paste a URL above to start.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((p) => {
                const title = p.name || p.origin || "Untitled project";
                // inside the map((p) => ...) where you render each project
                const targetUrl = (p as any).last_url || p.origin;  // <— use last_url first
                const annotateHref =
                  `/annotate/view?project=${encodeURIComponent(p.id)}` +
                  (targetUrl ? `&url=${encodeURIComponent(targetUrl)}` : "");

                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 transition"
                  >
                    <div className="p-4">
                      <div className="text-base font-semibold">{title}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {p.origin || "—"}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                           <Link
                            href={{ pathname: "/annotate/view", query: { url: p.origin, project: p.id } }}
                            prefetch={false}
                            className="rounded-lg bg-sky-400 text-black px-3 py-1.5 text-sm font-medium"
                          >
                            Annotate
                          </Link>
                        <DeleteProjectButton id={p.id} name={title} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="mt-10 text-xs text-neutral-500">
        By using this tool you agree to proxy the requested page for review purposes and respect third-party Terms of Service.
      </div>
    </main>
  );
}
