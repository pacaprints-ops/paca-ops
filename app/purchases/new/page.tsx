"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type SupplierRow = { id: string; name: string };
type MaterialRow = { id: string; name: string };

type Line = {
  material_id: string;
  new_material_name: string;
  quantity: string;
  line_cost: string;
  starred: boolean;
  notes: string;
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const VAT_RATE = 0.2;
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function NewPurchasePage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [saving, setSaving] = useState(false);

  // header fields
  const [supplierId, setSupplierId] = useState<string>("");
  const [newSupplierName, setNewSupplierName] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(todayISO());
  const [purchaseNumber, setPurchaseNumber] = useState<string>("");
  const [shippingCost, setShippingCost] = useState<string>("0");
  // Paca isn't VAT registered, so VAT is part of the real cost. Tick this when the
  // invoice lists prices without VAT: 20% is added to every line and the shipping on save.
  const [addVat, setAddVat] = useState(false);
  const withVat = (n: number) => (addVat ? round2(n * (1 + VAT_RATE)) : n);
  // ✅ removing header notes as per snag list
  // const [poNotes, setPoNotes] = useState<string>("");

  // line items
  const [lines, setLines] = useState<Line[]>([
    {
      material_id: "",
      new_material_name: "",
      quantity: "50",
      line_cost: "10",
      starred: false,
      notes: "",
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const { data: sData, error: sErr } = await supabase
          .from("suppliers")
          .select("id,name")
          .order("name", { ascending: true });
        if (sErr) throw sErr;

        const { data: mData, error: mErr } = await supabase.rpc("list_materials_summary", {
          p_search: null,
        });
        if (mErr) throw mErr;

        if (cancelled) return;

        const safeSuppliers = (sData ?? []) as SupplierRow[];
        const safeMaterials = ((mData ?? []) as any[]).map((r) => ({
          id: r.material_id,
          name: r.material_name,
        })) as MaterialRow[];

        setSuppliers(safeSuppliers);
        setMaterials(safeMaterials);

        if (safeSuppliers.length > 0) setSupplierId(safeSuppliers[0].id);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? "Failed to load form data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const exVat = lines.reduce((sum, l) => sum + toNum(l.line_cost), 0) + toNum(shippingCost);
    const itemsCost = lines.reduce((sum, l) => sum + withVat(toNum(l.line_cost)), 0);
    const ship = withVat(toNum(shippingCost));
    const total = itemsCost + ship;
    return { itemsCost, ship, total, vat: total - exVat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, shippingCost, addVat]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { material_id: "", new_material_name: "", quantity: "1", line_cost: "0", starred: false, notes: "" },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function savePurchase() {
    setErrorMsg("");

    if (!supplierId && !newSupplierName.trim()) {
      setErrorMsg("Supplier is required.");
      return;
    }

    const cleanLines = lines
      .map((l) => ({
        ...l,
        new_material_name: l.new_material_name.trim(),
        qty: toNum(l.quantity),
        cost: toNum(l.line_cost),
      }))
      .filter((l) => l.qty > 0 && (l.material_id || l.new_material_name));

    if (cleanLines.length === 0) {
      setErrorMsg("Add at least one valid line item (material + qty).");
      return;
    }

    setSaving(true);

    try {
      let finalSupplierId = supplierId;

      // manual supplier name wins
      if (newSupplierName.trim()) {
        const { data: sid, error: sErr } = await supabase.rpc("get_or_create_supplier", {
          p_name: newSupplierName.trim(),
        });
        if (sErr) throw sErr;
        finalSupplierId = sid as string;
      }

      // resolve materials and build payload
      const itemsPayload: any[] = [];

      for (const l of cleanLines) {
        let materialId = l.material_id;

        if (!materialId && l.new_material_name) {
          const { data: mid, error: mErr } = await supabase.rpc("get_or_create_material", {
            p_name: l.new_material_name,
          });
          if (mErr) throw mErr;
          materialId = mid as string;
        }

        if (!materialId) continue;

        itemsPayload.push({
          material_id: materialId,
          quantity: l.qty,
          line_cost: withVat(l.cost),
          starred: !!l.starred,
          notes: l.notes?.trim() || null,
        });
      }

      if (itemsPayload.length === 0) {
        throw new Error("No valid items to save.");
      }

      // single RPC
      const { error: createErr } = await supabase.rpc("create_purchase_order_with_items", {
        p_supplier_id: finalSupplierId,
        p_purchase_date: purchaseDate,
        p_items: itemsPayload,
        p_purchase_number: purchaseNumber.trim() || null,
        p_shipping_cost: withVat(toNum(shippingCost)),
        p_notes: null, // header notes removed
      });

      if (createErr) throw createErr;

      router.push("/purchases");
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Add purchase</h1>
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="text-sm text-gray-600 underline">
            Back to purchases
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 underline">
            Dashboard
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-lg border bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Supplier</div>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setNewSupplierName("");
                  }}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Or new supplier name</div>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={newSupplierName}
                    onChange={(e) => {
                      setNewSupplierName(e.target.value);
                      if (e.target.value.trim()) setSupplierId("");
                    }}
                    placeholder="e.g. B2 Supplies"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    If filled, this will create a new supplier on save.
                  </div>
                </div>
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Purchase date</div>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Purchase # (optional)</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={purchaseNumber}
                  onChange={(e) => setPurchaseNumber(e.target.value)}
                  placeholder="e.g. INV-1234"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Shipping cost</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="mt-3 flex items-start gap-2 rounded-md border bg-amber-50 px-3 py-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={addVat}
                onChange={(e) => setAddVat(e.target.checked)}
              />
              <span>
                <span className="font-medium text-gray-900">Add VAT (20%)</span>
                <span className="block text-xs text-gray-600">
                  Tick if the invoice prices are without VAT. Type the prices as shown, and 20% is added to each
                  line and the shipping when you save. The Total below should match the invoice total.
                </span>
              </span>
            </label>

            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Items £{addVat ? " (inc VAT)" : ""}</div>
                <div className="font-semibold">{totals.itemsCost.toFixed(2)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Shipping £{addVat ? " (inc VAT)" : ""}</div>
                <div className="font-semibold">{totals.ship.toFixed(2)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Total £</div>
                <div className="font-semibold">{totals.total.toFixed(2)}</div>
                {addVat ? (
                  <div className="text-[11px] text-gray-500">includes £{totals.vat.toFixed(2)} VAT</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">Items</div>
              <button
                type="button"
                className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={addLine}
              >
                Add item
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {lines.map((l, idx) => (
                <div key={idx} className="rounded-md border p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    {/* ROW 1 */}
                    <label className="sm:col-span-6">
                      <div className="text-xs font-medium text-gray-700 mb-1">Material</div>
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                        value={l.material_id}
                        onChange={(e) => updateLine(idx, { material_id: e.target.value })}
                      >
                        <option value="">Select material…</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="sm:col-span-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Qty</div>
                      <input
                        inputMode="decimal"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={l.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Line £</div>
                      <input
                        inputMode="decimal"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={l.line_cost}
                        onChange={(e) => updateLine(idx, { line_cost: e.target.value })}
                      />
                    </label>

                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        onClick={() => updateLine(idx, { starred: !l.starred })}
                        title={l.starred ? "Unstar" : "Star"}
                      >
                        {l.starred ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        className="w-full rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        title="Remove line"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* ROW 2: Manual material under Material */}
                    <div className="sm:col-span-6">
                      <div className="text-xs font-medium text-gray-700 mb-1">Or new material name</div>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={l.new_material_name}
                        onChange={(e) => updateLine(idx, { new_material_name: e.target.value })}
                        placeholder="e.g. A5 Card – 200gsm"
                      />
                      <div className="text-[11px] text-gray-500 mt-1">
                        If filled, this will create a new material on save.
                      </div>
                    </div>

                    {/* spacer columns on desktop */}
                    <div className="hidden sm:block sm:col-span-6" />

                    {/* ROW 3: Notes */}
                    <label className="sm:col-span-12">
                      <div className="text-xs font-medium text-gray-700 mb-1">Notes</div>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={l.notes}
                        onChange={(e) => updateLine(idx, { notes: e.target.value })}
                        placeholder="Optional line note…"
                      />
                    </label>

                    {/* Unit cost */}
                    <div className="sm:col-span-12 text-xs text-gray-500">
                      Unit cost{addVat ? " (inc VAT)" : ""}:{" "}
                      <strong>
                        £
                        {toNum(l.quantity) > 0
                          ? (withVat(toNum(l.line_cost)) / toNum(l.quantity)).toFixed(4)
                          : "0.0000"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="rounded-lg border bg-white p-4">
            <button
              type="button"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              disabled={saving}
              onClick={savePurchase}
            >
              {saving ? "Saving…" : "Save purchase"}
            </button>

            <div className="mt-2 text-xs text-gray-500">
              Saving creates the purchase order + items. Use “Post” on the Purchases list to create FIFO batches.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

