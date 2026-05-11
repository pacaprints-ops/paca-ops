"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type ParsedRow = {
  platform_order_ref: string;
  payout: number;
  platform_fees: number;
};

type RowResult = {
  ref: string;
  action: "updated" | "not_found" | "error";
  msg?: string;
};

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { cols.push(cur); cur = ""; }
    else { cur += c; }
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
    if (cols.length < 3) continue;
    const ref = cols[0]?.trim() ?? "";
    if (!ref) continue;
    rows.push({
      platform_order_ref: ref,
      payout: parseFloat(cols[1]) || 0,
      platform_fees: parseFloat(cols[2]) || 0,
    });
  }
  return rows;
}

export default function SettleOrdersPage() {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(parseCsv(text));
      setResults([]);
      setDone(false);
      setProgress(0);
    };
    reader.readAsText(file);
  }

  function handleParse() {
    setParsed(parseCsv(csvText));
    setResults([]);
    setDone(false);
    setProgress(0);
  }

  async function runSettle() {
    if (!parsed || parsed.length === 0) return;
    setRunning(true);
    setResults([]);
    setDone(false);
    setProgress(0);

    const out: RowResult[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      try {
        const { data: existing, error: findErr } = await supabase
          .from("orders")
          .select("id")
          .eq("platform_order_ref", row.platform_order_ref)
          .maybeSingle();

        if (findErr) throw findErr;

        if (!existing?.id) {
          out.push({ ref: row.platform_order_ref, action: "not_found" });
        } else {
          const { error: updateErr } = await supabase
            .from("orders")
            .update({ revenue: row.payout, platform_fees: row.platform_fees, is_settled: true })
            .eq("id", existing.id);
          if (updateErr) throw updateErr;
          out.push({ ref: row.platform_order_ref, action: "updated" });
        }
      } catch (e: any) {
        out.push({ ref: row.platform_order_ref, action: "error", msg: e?.message ?? "Unknown error" });
      }

      setResults([...out]);
      setProgress(i + 1);
    }

    setRunning(false);
    setDone(true);
  }

  const summary = {
    updated: results.filter((r) => r.action === "updated").length,
    not_found: results.filter((r) => r.action === "not_found").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  return (
    <main className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Settle orders</h1>
        <Link href="/orders" className="text-sm text-gray-600 underline">Back to orders</Link>
      </div>

      {!done && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Load CSV</p>
            <p className="text-xs text-gray-500">
              3 columns: <span className="font-mono">Platform ref, Payout, Fee</span> — only updates payout and fees, nothing else is touched.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
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
            <button onClick={handleParse} disabled={!csvText.trim()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              Parse &amp; preview
            </button>
          </div>

          {parsed !== null && (
            <div className="rounded-lg border bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">{parsed.length} rows parsed</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3 font-medium">Ref</th>
                      <th className="pb-2 pr-3 font-medium text-right">Payout</th>
                      <th className="pb-2 pr-3 font-medium text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono text-gray-500 max-w-[200px] truncate">{row.platform_order_ref}</td>
                        <td className="py-1 pr-3 text-right text-gray-700">£{row.payout.toFixed(2)}</td>
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
                    <div className="bg-gray-900 h-2 rounded-full transition-all" style={{ width: `${(progress / parsed.length) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <button onClick={runSettle} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                  Update {parsed.length} orders
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Done</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 font-medium">{summary.updated} updated</span>
              {summary.not_found > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 font-medium">{summary.not_found} not found</span>}
              {summary.errors > 0 && <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 font-medium">{summary.errors} errors</span>}
            </div>
            <div className="flex gap-3">
              <Link href="/orders" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">View orders</Link>
              <button onClick={() => { setDone(false); setParsed(null); setCsvText(""); setResults([]); }} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700">
                Settle another
              </button>
            </div>
          </div>

          {summary.not_found > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">Not found</p>
              <ul className="space-y-1 text-xs text-amber-700">
                {results.filter((r) => r.action === "not_found").map((r, i) => (
                  <li key={i} className="font-mono">{r.ref}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.errors > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800 mb-2">Errors</p>
              <ul className="space-y-1 text-xs text-red-700">
                {results.filter((r) => r.action === "error").map((r, i) => (
                  <li key={i}><span className="font-mono">{r.ref}</span> — {r.msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
