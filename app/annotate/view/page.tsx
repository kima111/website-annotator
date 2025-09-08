import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default function View({ searchParams }: { searchParams: { url?: string, project?: string }} ){
  const url = searchParams.url ?? '';
  const project = searchParams.project ?? '';
  const proxySrc = url
    ? `/proxy?url=${encodeURIComponent(url)}${project ? `&project=${encodeURIComponent(project)}` : ''}`
    : '';

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar />
      <div className="flex-1 flex items-center justify-center">
        {url ? (
          <iframe
            src={proxySrc}
            style={{ width: '90vw', height: '90vh' }}
            className="border-0"
          />
        ) : (
          <div className="max-w-3xl mx-auto p-6 text-neutral-300">Enter a URL above.</div>
        )}
      </div>
    </div>
  );
}
