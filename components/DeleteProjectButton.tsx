"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProjectButton({
  id,
  name,
}: { id: string; name?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        if (loading) return;
        if (!confirm(`Delete project “${name || id}”? This cannot be undone.`)) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: "DELETE",
            headers: { accept: "application/json" },
            cache: "no-store",
          });
          const js = await res.json().catch(() => null);
          if (!res.ok) {
            alert(js?.error || `Delete failed (${res.status})`);
          } else {
            router.refresh(); // reload the server component list
          }
        } catch {
          alert("Network error deleting project.");
        } finally {
          setLoading(false);
        }
      }}
      className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold border border-red-700 text-red-300 hover:bg-red-900/30"
      title="Delete project"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
