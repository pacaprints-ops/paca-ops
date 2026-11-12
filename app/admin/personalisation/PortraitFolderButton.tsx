"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortraitFolderButton({ id, url }: { id: string; url?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/personalise/portrait-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.error) setMsg(data.error);
      else {
        if (data.missing?.length) setMsg(`Couldn't find in Drive: ${data.missing.join(", ")}`);
        window.open(data.url, "_blank", "noreferrer");
        router.refresh();
      }
    } catch {
      setMsg("Something went wrong — try again");
    }
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="rounded bg-[var(--pp-teal,#0d9488)] px-3 py-1 text-sm font-semibold text-white">
          Open this order&apos;s files in Drive
        </a>
      )}
      <button onClick={make} disabled={busy} className="rounded border px-3 py-1 text-sm text-gray-700 disabled:opacity-50">
        {busy ? "Copying files…" : url ? "Re-make folder" : "Make Drive folder"}
      </button>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
