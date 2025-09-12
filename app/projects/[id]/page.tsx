// app/projects/[id]/page.tsx
import Link from "next/link";
import { headers as nextHeaders, cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
// import TopBar from "@/components/TopBar"; // uncomment if you have this
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Project = {
  id: string;
  name: string | null;
  origin: string | null;
  last_url?: string | null;      // provided by /api/projects/list
  created_at?: string | null;
  last_activity?: string | null;
};

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = nextHeaders();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchProjectSSR(id: string): Promise<Project | null> {
  const base = getBaseUrl();
  const cookieHeader = cookies().getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${base}/api/projects/list`, {
    cache: "no-store",
    headers: { accept: "application/json", cookie: cookieHeader },
  }).catch(() => null as any);

  if (!res || !res.ok) return null;
  const js = await res.json().catch(() => null as any);
  const projects = (js?.projects as Project[]) ?? [];
  return projects.find(p => p.id === id) ?? null;
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;
  const proj = await fetchProjectSSR(params.id);
  if (!proj) notFound();

  const title = proj.name || proj.origin || "Untitled project";
  const targetUrl = proj.last_url || proj.origin || "";
  const annotateHref =
    `/annotate/view?project=${encodeURIComponent(proj.id)}` +
    (targetUrl ? `&url=${encodeURIComponent(targetUrl)}` : "");
  const loginNext = encodeURIComponent(annotateHref);
  const annotateLink = user ? annotateHref : `/login?next=${loginNext}`;

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* <TopBar /> */}
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="text-sm text-neutral-500 mt-1">{proj.origin || "—"}</div>

      <div className="mt-6 flex gap-2 items-center">
        <Link
          href={annotateLink}
          className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400"
        >
          Annotate
        </Link>
        <DeleteProjectButton id={proj.id} name={title} />
        {!user && (
          <div className="ml-3 text-xs bg-amber-900/40 border border-amber-700 text-amber-200 rounded px-2 py-1">
            Login required to annotate — you’ll be redirected back here.
          </div>
        )}
      </div>

      <div className="mt-10 text-sm text-neutral-400">
        {proj.last_url
          ? <>Last activity on <span className="font-mono">{proj.last_url}</span></>
          : <>No pins yet. Click <b>Annotate</b> to start.</>}
      </div>
    </main>
  );
}
