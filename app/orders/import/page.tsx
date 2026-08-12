"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type ParsedRow = {
  platform_order_ref: string;
  platform: string;
  product_name: string;
  quantity: number;
  discounts: number;
  gross_revenue: number;
  order_date: string;
  raw_date: string;
  date_ok: boolean;
  customer_name: string;
  revenue: number;
  shipping_cost: number;
  recipe: string;
  platform_fees: number;
};

type RowResult = {
  ref: string;
  action: "created" | "updated" | "skipped" | "error";
  msg?: string;
};

function normalizePlatform(p: string): string {
  const lower = p.trim().toLowerCase().replace(/\s+/g, "");
  if (lower === "titkok" || lower === "tiktok") return "tiktok";
  if (lower === "shopify") return "shopify";
  if (lower === "ebay") return "ebay";
  if (lower === "etsy") return "etsy";
  return lower || "tiktok";
}

function parseDate(raw: string): { iso: string; ok: boolean } {
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return { iso: "", ok: false };
  let [d, m, y] = parts;
  // Fix typo years like "0202" → "2026"
  const yr = parseInt(y, 10);
  if (yr < 2020 || yr > 2035) y = "2026";
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(iso);
  return { iso, ok: !isNaN(dt.getTime()) };
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      cols.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length < 10) continue;
    const raw_date = cols[6]?.trim() ?? "";
    const { iso, ok } = parseDate(raw_date);
    rows.push({
      platform_order_ref: cols[0]?.trim() ?? "",
      platform: normalizePlatform(cols[1] ?? ""),
      product_name: cols[2]?.trim() ?? "",
      quantity: parseInt(cols[3]) || 1,
      discounts: parseFloat(cols[4]) || 0,
      gross_revenue: parseFloat(cols[5]) || 0,
      order_date: iso,
      raw_date,
      date_ok: ok,
      customer_name: cols[7]?.trim() ?? "",
      revenue: parseFloat(cols[8]) || 0,
      shipping_cost: parseFloat(cols[9]) || 0,
      recipe: cols[10]?.trim() ?? "",
      platform_fees: parseFloat(cols[11]) || 0,
    });
  }
  return rows;
}

export default function ImportOrdersPage() {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleParse() {
    const rows = parseCsv(csvText);
    setParsed(rows);
    setResults([]);
    setDone(false);
    setProgress(0);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const rows = parseCsv(text);
      setParsed(rows);
      setResults([]);
      setDone(false);
      setProgress(0);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!parsed || parsed.length === 0) return;
    setRunning(true);
    setResults([]);
    setDone(false);
    setProgress(0);

    // Load recipes once up front so we can match by name during the loop
    const { data: recipesData } = await supabase.from("recipes").select("id,name");
    const recipeMap: Record<string, string> = {};
    for (const r of recipesData ?? []) {
      recipeMap[r.name.trim().toLowerCase()] = r.id;
    }

    const out: RowResult[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];

      if (!row.platform_order_ref) {
        const r: RowResult = { ref: "(no ref)", action: "skipped", msg: "No platform order ref" };
        out.push(r);
        setResults([...out]);
        setProgress(i + 1);
        continue;
      }

      if (!row.date_ok || !row.order_date) {
        const r: RowResult = { ref: row.platform_order_ref, action: "skipped", msg: `Bad date: ${row.raw_date}` };
        out.push(r);
        setResults([...out]);
        setProgress(i + 1);
        continue;
      }

      try {
        const { data: existing, error: checkErr } = await supabase
          .from("orders")
          .select("id")
          .eq("platform_order_ref", row.platform_order_ref)
          .maybeSingle();

        if (checkErr) throw checkErr;

        if (existing?.id) {
          const { error: updateErr } = await supabase.rpc("update_order_header", {
            p_order_id: existing.id,
            p_order_date: row.order_date,
            p_platform: row.platform,
            p_platform_order_ref: row.platform_order_ref,
            p_customer_name: row.customer_name || null,
            p_revenue: row.revenue,
            p_shipping_cost: row.shipping_cost,
            p_discounts: row.discounts,
            p_gross_revenue: row.gross_revenue,
            p_platform_fees: row.platform_fees,
            p_cogs_override: null,
          });
          if (updateErr) throw updateErr;

          // A multi-item order arrives as several CSV rows sharing one order ref: the first
          // creates the order, the rest land here. Add this row's product unless it is already
          // on the order — checking per-product (not "has any items") so items 2..n aren't
          // dropped, while re-importing the same file stays idempotent.
          const productName = row.product_name.trim();
          const recipeId = recipeMap[row.recipe.trim().toLowerCase()] ?? null;
          if (productName && recipeId) {
            const { data: existingItems } = await supabase
              .from("order_products")
              .select("id,product_id")
              .eq("order_id", existing.id);

            const { data: productRow } = await supabase
              .from("products")
              .select("id")
              .ilike("name", productName)
              .maybeSingle();

            let productId = productRow?.id;
            if (!productId) {
              const { data: newProduct, error: newProductErr } = await supabase
                .from("products")
                .insert({ name: productName })
                .select("id")
                .single();
              if (newProductErr) throw newProductErr;
              productId = newProduct.id;
            }

            const alreadyOnOrder = (existingItems ?? []).some((i) => i.product_id === productId);
            if (!alreadyOnOrder) {
              const { error: lineErr } = await supabase.rpc("add_order_product", {
                p_order_id: existing.id,
                p_recipe_id: recipeId,
                p_quantity: row.quantity,
                p_product_id: productId,
              });
              if (lineErr) throw lineErr;
            }
          }

          const r: RowResult = { ref: row.platform_order_ref, action: "updated" };
          out.push(r);
        } else {
          const { data: orderId, error: createErr } = await supabase.rpc("create_order", {
            p_order_date: row.order_date,
            p_customer_name: row.customer_name || null,
            p_platform: row.platform,
            p_platform_order_ref: row.platform_order_ref,
            p_revenue: row.revenue,
            p_shipping_cost: row.shipping_cost,
            p_discounts: row.discounts,
          });
          if (createErr) throw createErr;

          const { error: moneyErr } = await supabase.rpc("update_order_money", {
            p_order_id: orderId,
            p_gross_revenue: row.gross_revenue,
            p_platform_fees: row.platform_fees,
            p_payout: row.revenue,
            p_shipping_cost: row.shipping_cost,
            p_discounts: row.discounts,
          });
          if (moneyErr) throw moneyErr;

          // Add line item so this order appears in product sales.
          const productName = row.product_name.trim();
          if (productName) {
            const recipeId = recipeMap[row.recipe.trim().toLowerCase()] ?? null;

            // Case-insensitive lookup to avoid duplicate product name errors
            const { data: productRow, error: findErr } = await supabase
              .from("products")
              .select("id")
              .ilike("name", productName)
              .maybeSingle();
            if (findErr) throw findErr;

            let productId = productRow?.id;
            if (!productId) {
              const { data: newProduct, error: newProductErr } = await supabase
                .from("products")
                .insert({ name: productName })
                .select("id")
                .single();
              if (newProductErr) throw newProductErr;
              productId = newProduct.id;
            }

            const { error: lineErr } = await supabase.rpc("add_order_product", {
              p_order_id: orderId,
              p_recipe_id: recipeId,
              p_quantity: row.quantity,
              p_product_id: productId,
            });
            if (lineErr) throw lineErr;
          }

          const r: RowResult = { ref: row.platform_order_ref, action: "created" };
          out.push(r);
        }
      } catch (e: any) {
        const r: RowResult = { ref: row.platform_order_ref, action: "error", msg: e?.message ?? "Unknown error" };
        out.push(r);
      }

      setResults([...out]);
      setProgress(i + 1);
    }

    setRunning(false);
    setDone(true);
  }

  const summary = {
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  const badDates = parsed?.filter((r) => !r.date_ok) ?? [];

  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Import orders (CSV)</h1>
        <Link href="/orders" className="text-sm text-gray-600 underline">
          Back to orders
        </Link>
      </div>

      {!done && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Load CSV</p>
            <p className="text-xs text-gray-500">
              Expected columns: Platform ref, Platform, Product Name, Quantity, Discount, Customer Paid, Date (DD/MM/YYYY), Recipient, Payout, Shipping, Recipe, Fee
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                Upload file
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>
            <p className="text-xs text-gray-400">— or paste CSV below —</p>
            <textarea
              className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-mono text-gray-700 h-40 resize-y"
              placeholder="Paste CSV here…"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <button
              onClick={handleParse}
              disabled={!csvText.trim()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Parse &amp; preview
            </button>
          </div>

          {parsed !== null && (
            <div className="rounded-lg border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  {parsed.length} rows parsed
                </p>
                {badDates.length > 0 && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    {badDates.length} rows had bad dates — year auto-fixed to 2026
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Platform</th>
                      <th className="pb-2 pr-3 font-medium">Ref</th>
                      <th className="pb-2 pr-3 font-medium">Customer</th>
                      <th className="pb-2 pr-3 font-medium">Product</th>
                      <th className="pb-2 pr-3 font-medium text-right">Gross</th>
                      <th className="pb-2 pr-3 font-medium text-right">Payout</th>
                      <th className="pb-2 pr-3 font-medium text-right">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className={`border-b last:border-0 ${!row.date_ok ? "bg-amber-50" : ""}`}>
                        <td className="py-1 pr-3 text-gray-700">
                          {row.order_date || <span className="text-amber-600">{row.raw_date}</span>}
                        </td>
                        <td className="py-1 pr-3 text-gray-700">{row.platform}</td>
                        <td className="py-1 pr-3 text-gray-500 font-mono max-w-[140px] truncate">{row.platform_order_ref}</td>
                        <td className="py-1 pr-3 text-gray-700">{row.customer_name}</td>
                        <td className="py-1 pr-3 text-gray-500 max-w-[140px] truncate">{row.product_name}</td>
                        <td className="py-1 pr-3 text-right text-gray-700">£{row.gross_revenue.toFixed(2)}</td>
                        <td className="py-1 pr-3 text-right text-gray-700">£{row.revenue.toFixed(2)}</td>
                        <td className="py-1 pr-3 text-right text-gray-500">£{row.platform_fees.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {running ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Processing…</span>
                    <span>{progress} / {parsed.length}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gray-900 h-2 rounded-full transition-all"
                      style={{ width: `${(progress / parsed.length) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={runImport}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Run import ({parsed.length} rows)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Import complete</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 font-medium">
                {summary.created} created
              </span>
              <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1 font-medium">
                {summary.updated} updated
              </span>
              {summary.skipped > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 font-medium">
                  {summary.skipped} skipped
                </span>
              )}
              {summary.errors > 0 && (
                <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 font-medium">
                  {summary.errors} errors
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/orders"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                View orders
              </Link>
              <button
                onClick={() => { setDone(false); setParsed(null); setCsvText(""); setResults([]); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700"
              >
                Import another
              </button>
            </div>
          </div>

          {summary.errors > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800 mb-2">Errors</p>
              <ul className="space-y-1 text-xs text-red-700">
                {results.filter((r) => r.action === "error").map((r, i) => (
                  <li key={i}>
                    <span className="font-mono">{r.ref}</span> — {r.msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.skipped > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">Skipped</p>
              <ul className="space-y-1 text-xs text-amber-700">
                {results.filter((r) => r.action === "skipped").map((r, i) => (
                  <li key={i}>
                    <span className="font-mono">{r.ref}</span> — {r.msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
