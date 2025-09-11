// app/annotate/view/page.tsx
import TopBar from "@/components/TopBar";
import FrameWithOverlay from "./FrameWithOverlay"; // ⬅️ new client component below
import Link from "next/link";
import { createClientRSC } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function View({
  searchParams,
}: {
  searchParams: { url?: string; project?: string };
}) {
  const url = searchParams.url ?? "";
  const project = searchParams.project ?? "";

  // Require login before rendering the annotator
  const supa = createClientRSC();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    const qp = new URLSearchParams();
    if (url) qp.set("url", url);
    if (project) qp.set("project", project);
    const next = `/annotate/view${
      qp.toString() ? `?${qp.toString()}` : ""
    }`;
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Login required</h1>
          <p className="text-neutral-400 mb-4">
            Please sign in to annotate this page.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-flex items-center rounded-lg px-3 py-2 font-semibold bg-sky-500 text-black hover:bg-sky-400"
            >
              Log in
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="inline-flex items-center rounded-lg px-3 py-2 font-semibold border border-neutral-700 hover:bg-neutral-900"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar />
      <div className="flex-1 flex items-center justify-center">
        {url ? (
          <FrameWithOverlay url={url} project={project} />
        ) : (
          <div className="max-w-3xl mx-auto p-6 text-neutral-300">
            Enter a URL above.
          </div>
        )}
      </div>
    </div>
  );
}
