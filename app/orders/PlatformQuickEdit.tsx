"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const OPTIONS = [
  { v: "tiktok", l: "TikTok" },
  { v: "shopify", l: "Shopify" },
  { v: "etsy", l: "Etsy" },
  { v: "ebay", l: "eBay" },
  { v: "custom", l: "Custom…" },
];

export default function PlatformQuickEdit({
  orderId,
  currentPlatform,
}: {
  orderId: string;
  currentPlatform: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<string>(currentPlatform ?? "tiktok");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function save() {
    setErrorMsg("");
    const effective = platform === "custom" ? custom.trim() : platform;
    if (!effective) return setErrorMsg("Please choose a platform (or enter custom).");

    setSaving(true);
    const { error } = await supabase.rpc("update_order_platform", {
      p_order_id: orderId,
      p_platform: effective,
    });
    setSaving(false);

    if (error) return setErrorMsg(error.message);

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="cursor-pointer underline-offset-2 hover:underline hover:text-teal-700 transition"
        onClick={() => {
          setPlatform(currentPlatform ?? "tiktok");
          setCustom("");
          setErrorMsg("");
          setOpen(true);
        }}
        title="Quick edit platform"
      >
        {currentPlatform ?? "—"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />

          <div className="relative w-full max-w-sm rounded-xl border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Update platform</div>
                <div className="text-xs text-gray-500">Order ID: {orderId}</div>
              </div>
              <button
                type="button"
                className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>

              {platform === "custom" ? (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custom platform</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="e.g. Instagram"
                  />
                </div>
              ) : null}
            </div>

            {errorMsg ? (
              <div className="mt-3 rounded-lg border bg-red-50 p-2 text-xs text-red-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}