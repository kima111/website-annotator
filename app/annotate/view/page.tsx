// app/annotate/view/page.tsx
import TopBar from "@/components/TopBar";
import FrameWithOverlay from "./FrameWithOverlay"; // ⬅️ new client component below

export const dynamic = "force-dynamic";

export default function View({
  searchParams,
}: {
  searchParams: { url?: string; project?: string };
}) {
  const url = searchParams.url ?? "";
  const project = searchParams.project ?? "";

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
