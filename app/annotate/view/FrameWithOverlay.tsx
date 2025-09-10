// app/annotate/view/FrameWithOverlay.tsx
"use client";
import { useEffect, useRef } from "react";

export default function FrameWithOverlay({ url, project }:{ url:string; project?:string; }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const proxySrc = `/proxy?url=${encodeURIComponent(url)}${project ? `&project=${encodeURIComponent(project)}` : ""}`;

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    let injectedForThisLoad = false;

    const inject = () => {
      if (injectedForThisLoad) return;
      injectedForThisLoad = true;
      try {
        const win = iframe.contentWindow;
        const doc = win?.document;
        if (!win || !doc) return;
        // provide config
        (win as any).__ANNOTATOR__ = { url, project: project || null };
        // inject overlay once
        if (!doc.getElementById("__overlay_js")) {
          const s = doc.createElement("script");
          s.id = "__overlay_js";
          s.src = "/overlay.js";
          s.async = true;
          (doc.head || doc.documentElement).appendChild(s);
        }
      } catch { /* same-origin only */ }
    };

    const onLoad = () => { injectedForThisLoad = false; inject(); };

    iframe.addEventListener("load", onLoad);
    // don’t auto-inject on readyState to avoid double-fire with load
    return () => iframe.removeEventListener("load", onLoad);
  }, [url, project]);

  return <iframe ref={ref} src={proxySrc} style={{ width: "90vw", height: "90vh" }} className="border-0" />;
}
