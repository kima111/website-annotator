"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({
  id,
  name,
}: {
  id: string;
  name?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onDelete() {
    if (busy) return;
    const label = name || "this project";
    if (!confirm(`Delete ${label}? This will remove all pins and memberships.`)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error || `Delete failed (${res.status})`);
      } else {
        // Re-fetch SSR data so the card disappears
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold border border-neutral-700 hover:bg-neutral-900 disabled:opacity-60"
      title="Delete project"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
