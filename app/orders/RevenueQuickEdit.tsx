"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function fmtGBP(n: any) {
  const x = Number(n ?? 0);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number.isFinite(x) ? x : 0
  );
}

export default function RevenueQuickEdit({
  orderId,
  currentRevenue,
}: {
  orderId: string;
  currentRevenue: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState<string>(String(currentRevenue ?? 0));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const parsed = useMemo(() => {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }, [val]);

  async function save() {
    setErrorMsg("");

    if (parsed === null) {
      setErrorMsg("Revenue must be a number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("update_order_revenue", {
      p_order_id: orderId,
      p_revenue: parsed,
    });
    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setOpen(false);
    router.refresh(); // refresh server component data
  }

  return (
    <>
      <button
        type="button"
        className="cursor-pointer underline-offset-2 hover:underline hover:text-teal-700 transition"
        onClick={() => {
          setVal(String(currentRevenue ?? 0));
          setErrorMsg("");
          setOpen(true);
        }}
        title="Quick edit revenue"
      >
        {fmtGBP(currentRevenue)}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />

          {/* modal */}
          <div className="relative w-full max-w-sm rounded-xl border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Update revenue</div>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Revenue (net payout)</label>
              <input
                inputMode="decimal"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="0.00"
              />
              <div className="mt-2 text-xs text-gray-500">
                New value: <strong>{fmtGBP(parsed ?? 0)}</strong>
              </div>
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
