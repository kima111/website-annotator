// app/projects/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type Project = {
  id: string;
  name: string | null;
  origin: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supa = createClient();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        Please <Link href="/login" className="underline">log in</Link>.
      </main>
    );
  }

  // Load the project (RLS limits visibility)
  const { data: project, error: pErr } = await supa
    .from("projects")
    .select("id,name,origin,created_at,updated_at")
    .eq("id", params.id)
    .maybeSingle<Project>();

  if (pErr || !project) notFound();

  // Load recent pages (distinct URLs from comments)
  const { data: comments } = await supa
    .from("comments")
    .select("url, created_at")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(200); // dedupe in TS

  const urls: string[] = [];
  for (const row of comments ?? []) {
    const u = row.url || "";
    if (u && !urls.includes(u)) urls.push(u);
  }

  const title = project.name || project.origin || "Project";

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="text-sm text-neutral-500 mt-1">{project.origin || "—"}</div>
        </div>
        <DeleteProjectButton id={project.id} name={title} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/annotate/view?project=${encodeURIComponent(project.id)}${
            project.origin ? `&url=${encodeURIComponent(project.origin)}` : ""
          }`}
          className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400"
        >
          Annotate
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg px-3 py-2 font-semibold border border-neutral-700 hover:bg-neutral-900"
        >
          Back
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Recent pages</h2>
        {urls.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-950 text-neutral-400 text-sm">
            No pages yet. Click <b>Annotate</b> to start.
          </div>
        ) : (
          <ul className="space-y-2">
            {urls.map((u) => (
              <li key={u} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <div className="truncate text-sm text-neutral-300">{u}</div>
                <Link
                  href={`/annotate/view?project=${encodeURIComponent(project.id)}&url=${encodeURIComponent(u)}`}
                  className="shrink-0 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold border border-neutral-700 hover:bg-neutral-900"
                >
                  Resume
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
