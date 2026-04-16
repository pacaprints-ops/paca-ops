"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type MaterialOption = { id: string; name: string };

type Props = {
  materials: MaterialOption[];
  onDone: () => void;
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function LogStockModal({ materials, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [qty, setQty] = useState("");
  const [lineCost, setLineCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setMaterialId("");
    setNewMaterialName("");
    setQty("");
    setLineCost("");
    setDate(todayISO());
    setErrorMsg("");
  }

  function close() {
    if (saving) return;
    reset();
    setOpen(false);
  }

  const unitCost =
    toNum(qty) > 0 && toNum(lineCost) > 0
      ? (toNum(lineCost) / toNum(qty)).toFixed(4)
      : null;

  async function submit() {
    setErrorMsg("");

    const qtyNum = toNum(qty);
    const costNum = toNum(lineCost);

    if (!materialId && !newMaterialName.trim()) {
      return setErrorMsg("Select a material or enter a new material name.");
    }
    if (qtyNum <= 0) {
      return setErrorMsg("Quantity must be greater than 0.");
    }

    setSaving(true);

    try {
      // Resolve material ID
      let finalMaterialId = materialId;
      if (!finalMaterialId && newMaterialName.trim()) {
        const { data: mid, error: mErr } = await supabase.rpc("get_or_create_material", {
          p_name: newMaterialName.trim(),
        });
        if (mErr) throw mErr;
        finalMaterialId = mid as string;
      }

      // Get/create "Opening Stock" supplier
      const { data: sid, error: sErr } = await supabase.rpc("get_or_create_supplier", {
        p_name: "Opening Stock",
      });
      if (sErr) throw sErr;

      // Create purchase order + items
      const { data: poId, error: createErr } = await supabase.rpc(
        "create_purchase_order_with_items",
        {
          p_supplier_id: sid as string,
          p_purchase_date: date,
          p_items: [
            {
              material_id: finalMaterialId,
              quantity: qtyNum,
              line_cost: costNum,
              starred: false,
              notes: "Opening stock",
            },
          ],
          p_purchase_number: null,
          p_shipping_cost: 0,
          p_notes: null,
        }
      );
      if (createErr) throw createErr;

      // Immediately post to inventory so batches are created
      const { error: postErr } = await supabase.rpc("post_purchase_order_to_inventory", {
        p_purchase_order_id: poId as string,
      });
      if (postErr) throw postErr;

      close();
      onDone();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to log stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700"
      >
        Log stock
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-base font-bold text-gray-900">Log existing stock</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Adds a batch directly to inventory (no purchase order needed).
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {/* Material select */}
              <label className="block text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Material</div>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  value={materialId}
                  onChange={(e) => {
                    setMaterialId(e.target.value);
                    if (e.target.value) setNewMaterialName("");
                  }}
                  disabled={saving}
                >
                  <option value="">Select existing…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* New material name */}
              <label className="block text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Or new material name</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newMaterialName}
                  onChange={(e) => {
                    setNewMaterialName(e.target.value);
                    if (e.target.value.trim()) setMaterialId("");
                  }}
                  placeholder="e.g. A5 Card – 200gsm"
                  disabled={saving}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Qty */}
                <label className="block text-sm">
                  <div className="text-xs font-medium text-gray-700 mb-1">Quantity</div>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="e.g. 100"
                    disabled={saving}
                  />
                </label>

                {/* Total cost */}
                <label className="block text-sm">
                  <div className="text-xs font-medium text-gray-700 mb-1">Total cost (£)</div>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={lineCost}
                    onChange={(e) => setLineCost(e.target.value)}
                    placeholder="e.g. 12.50"
                    disabled={saving}
                  />
                </label>
              </div>

              {unitCost ? (
                <div className="text-xs text-gray-500">Unit cost: <strong>£{unitCost}</strong></div>
              ) : null}

              {/* Date */}
              <label className="block text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Date</div>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={saving}
                />
              </label>

              {errorMsg ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-gray-700"
              >
                {saving ? "Saving…" : "Add to inventory"}
              </button>

              <div className="text-xs text-gray-500">
                Logged under supplier "Opening Stock". Appears as a FIFO batch immediately.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
