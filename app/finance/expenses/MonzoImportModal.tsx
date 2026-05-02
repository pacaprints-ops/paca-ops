"use client";

import { useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const HMRC_CATEGORIES = [
  "Advertising & Marketing",
  "Bank Charges & Fees",
  "Equipment & Tools",
  "Insurance",
  "Office Supplies & Stationery",
  "Phone & Internet",
  "Platform Fees",
  "Postage & Packaging",
  "Professional Fees",
  "Rent & Workspace",
  "Repairs & Maintenance",
  "Software & Subscriptions",
  "Stock & Materials",
  "Training & Development",
  "Travel & Transport",
  "Wages & Salaries",
  "Other Business Expenses",
];

type ParsedRow = {
  transactionId: string;
  date: string;        // YYYY-MM-DD
  displayDate: string; // DD/MM/YYYY
  name: string;
  type: string;
  amount: number;      // positive absolute value
};

type RowState = {
  checked: boolean;
  category: string;
};

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let inQuote = false;
  let cell = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function monzoDateToISO(d: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const parts = d.split("/");
  if (parts.length !== 3) return d;
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

function suggestCategory(name: string): string {
  const n = name.toLowerCase();
  if (/royal mail|evri|hermes|parcelforce|dpd|yodel|collect\+|interlink/.test(n))
    return "Postage & Packaging";
  if (/canva|adobe|dropbox|microsoft|google|shopify|notion|figma|slack|claude|anthropic|chatgpt|openai/.test(n))
    return "Software & Subscriptions";
  if (/\bbt\b|virgin media|sky |ee |o2|vodafone|three|talktalk|plusnet/.test(n))
    return "Phone & Internet";
  if (/insurance/.test(n)) return "Insurance";
  if (/etsy|tiktok shop|ebay fee|paypal fee/.test(n)) return "Platform Fees";
  if (/accountant|solicitor|legal/.test(n)) return "Professional Fees";
  if (/train|gwr|avanti|lner|tfl|bus |petrol|fuel|parking|uber|bolt\b/.test(n))
    return "Travel & Transport";
  if (/amazon|staples|ryman|viking direct|currys|argos/.test(n))
    return "Office Supplies & Stationery";
  if (/facebook|meta |instagram|pinterest|google ads/.test(n))
    return "Advertising & Marketing";
  if (/barclays fee|bank charge|stripe fee|paypal/.test(n))
    return "Bank Charges & Fees";
  return "Other Business Expenses";
}

// Types to skip — internal Monzo movements, not real expenses
const SKIP_TYPES = ["pot transfer", "transfer"];

function shouldSkip(type: string, name: string): boolean {
  const t = type.toLowerCase();
  const n = name.toLowerCase();
  if (SKIP_TYPES.some((s) => t.includes(s))) return true;
  if (n.includes("monzo") && t.includes("transfer")) return true;
  return false;
}

type Props = {
  onDone: () => void;
};

export default function MonzoImportModal({ onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [imported, setImported] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed([]);
    setRowStates({});
    setParseError("");
    setImportError("");
    setImported(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    if (importing) return;
    reset();
    setOpen(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError("");
    setImportError("");
    setImported(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setParseError("File appears empty or has no transactions.");
          return;
        }

        // Find header row — look for "Transaction ID" or "Date"
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase());

        const idxId = headers.findIndex((h) => h.includes("transaction id"));
        const idxDate = headers.findIndex((h) => h === "date");
        const idxType = headers.findIndex((h) => h === "type");
        const idxName = headers.findIndex((h) => h === "name");
        const idxAmount = headers.findIndex((h) => h === "amount");

        if (idxDate === -1 || idxAmount === -1 || idxName === -1) {
          setParseError(
            "This doesn't look like a Monzo CSV. Expected columns: Date, Name, Amount."
          );
          return;
        }

        const rows: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          const rawDate = cells[idxDate] ?? "";
          const rawAmount = cells[idxAmount] ?? "";
          const name = cells[idxName] ?? "";
          const type = idxType >= 0 ? (cells[idxType] ?? "") : "";
          const txId = idxId >= 0 ? (cells[idxId] ?? String(i)) : String(i);

          const amount = parseFloat(rawAmount);
          if (isNaN(amount) || amount >= 0) continue; // skip credits and invalid
          if (shouldSkip(type, name)) continue;        // skip internal transfers

          rows.push({
            transactionId: txId,
            date: monzoDateToISO(rawDate),
            displayDate: rawDate,
            name,
            type,
            amount: Math.abs(amount),
          });
        }

        if (rows.length === 0) {
          setParseError("No outgoing transactions found in this file.");
          return;
        }

        // Build initial row states — all checked, category auto-suggested
        const states: Record<number, RowState> = {};
        rows.forEach((r, i) => {
          states[i] = { checked: true, category: suggestCategory(r.name) };
        });

        setParsed(rows);
        setRowStates(states);
      } catch (err: any) {
        setParseError(err?.message ?? "Failed to parse file.");
      }
    };
    reader.readAsText(file);
  }

  function toggleAll(checked: boolean) {
    setRowStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[Number(k)] = { ...next[Number(k)], checked };
      });
      return next;
    });
  }

  function toggleRow(i: number) {
    setRowStates((prev) => ({
      ...prev,
      [i]: { ...prev[i], checked: !prev[i].checked },
    }));
  }

  function setCategory(i: number, category: string) {
    setRowStates((prev) => ({
      ...prev,
      [i]: { ...prev[i], category },
    }));
  }

  const selected = Object.entries(rowStates).filter(([, s]) => s.checked);
  const selectedTotal = selected.reduce(
    (sum, [i]) => sum + (parsed[Number(i)]?.amount ?? 0),
    0
  );

  async function importSelected() {
    setImportError("");
    if (selected.length === 0) {
      setImportError("Select at least one transaction to import.");
      return;
    }

    setImporting(true);
    try {
      await Promise.all(
        selected.map(([i, state]) => {
          const row = parsed[Number(i)];
          return supabase.rpc("create_expense", {
            p_expense_date: row.date,
            p_amount: row.amount,
            p_category: state.category,
            p_paid_by: "Business",
            p_vendor: row.name || null,
            p_notes: null,
            p_source_type: "manual",
            p_source_id: null,
          });
        })
      );
      setImported(selected.length);
      onDone();
    } catch (err: any) {
      setImportError(err?.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        Import Monzo CSV
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={close}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div>
                <div className="text-sm font-semibold text-gray-900">Import from Monzo</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Export your Monzo statement as CSV, then upload it here.
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={importing}
                className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* File upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Monzo CSV file
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  disabled={importing}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:cursor-pointer hover:file:bg-gray-50"
                />
                <div className="mt-1 text-xs text-gray-500">
                  In Monzo: Account → Statements → Export as CSV. Pot transfers and internal movements are skipped automatically.
                </div>
              </div>

              {parseError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {parseError}
                </div>
              ) : null}

              {imported !== null ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 font-semibold">
                  {imported} expense{imported !== 1 ? "s" : ""} imported successfully.
                </div>
              ) : null}

              {parsed.length > 0 && imported === null ? (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAll(true)}
                        className="rounded-md border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAll(false)}
                        className="rounded-md border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        Deselect all
                      </button>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">{selected.length}</span> selected ·{" "}
                      <span className="font-semibold">
                        £{selectedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Transaction table */}
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-semibold w-8"></th>
                          <th className="px-3 py-2 font-semibold whitespace-nowrap">Date</th>
                          <th className="px-3 py-2 font-semibold">Merchant</th>
                          <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Amount</th>
                          <th className="px-3 py-2 font-semibold min-w-[200px]">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row, i) => {
                          const state = rowStates[i];
                          return (
                            <tr
                              key={row.transactionId}
                              className={`border-b last:border-b-0 ${!state?.checked ? "opacity-40" : ""}`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!state?.checked}
                                  onChange={() => toggleRow(i)}
                                  disabled={importing}
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">
                                {row.displayDate}
                              </td>
                              <td className="px-3 py-2 text-gray-900">{row.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-semibold">
                                £{row.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  className="w-full rounded-md border bg-white px-2 py-1 text-xs"
                                  value={state?.category ?? "Other Business Expenses"}
                                  onChange={(e) => setCategory(i, e.target.value)}
                                  disabled={importing || !state?.checked}
                                >
                                  {HMRC_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {importError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {importError}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Footer */}
            {parsed.length > 0 && imported === null ? (
              <div className="border-t px-4 py-3 shrink-0 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Supplier purchases already logged via paca-ops will appear here — untick them to avoid duplicates.
                </div>
                <button
                  type="button"
                  onClick={importSelected}
                  disabled={importing || selected.length === 0}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 whitespace-nowrap"
                >
                  {importing ? "Importing…" : `Import ${selected.length} expense${selected.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
