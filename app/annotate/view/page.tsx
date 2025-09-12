// app/annotate/view/page.tsx
import TopBar from "@/components/TopBar";
import FrameWithOverlay from "./FrameWithOverlay";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function View({
  searchParams,
}: {
  searchParams: { url?: string; project?: string };
}) {
  const url = searchParams.url ?? "";
  const project = searchParams.project ?? "";

  const supa = createClient();
  const { data: auth, error } = await supa.auth.getUser();
  const user = !error ? auth?.user : null;
  if (!user) {
    const qp = new URLSearchParams();
    if (url) qp.set("url", url);
    if (project) qp.set("project", project);
    const next = `/annotate/view${qp.toString() ? `?${qp.toString()}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
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
