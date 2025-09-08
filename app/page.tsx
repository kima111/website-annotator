export default function Home(){
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-center pb-8">No‑install Website Markup</h1>
      <p className="text-neutral-300 mb-6">Open any public URL, drop pins, discuss, and export actionable changes — without adding a script to the target site.</p><br />
      <p className="text-neutral-400 mb-6 text-xs">To get started, enter a Fully Qualified Domain Name / URL below e.g. https://www.example.com</p>
      <form action="/annotate/view" method="get" className="flex gap-2">
        <input name="url" placeholder="https://example.com" className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2"/>
        <button className="rounded-lg bg-sky-400 text-black px-4 py-2 font-medium">Annotate</button>
      </form>
      <div className="mt-10 text-xs text-neutral-500">
        By using this tool you agree to proxy the requested page for review purposes and respect third‑party Terms of Service.
      </div>
    </main>
  );
}