"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import MonzoImportModal from "./MonzoImportModal";

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  vendor: string | null;
  notes: string | null;
  paid_by: string;
  source_type: string;
  source_id: string | null;
  created_at: string;
  total_count: number;
};

function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number.isFinite(n) ? n : 0
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}

// UK tax year: 6 April -> 6 April (end exclusive)
function getUKTaxYearRangeForYear(startYear: number) {
  const start = new Date(Date.UTC(startYear, 3, 6));
  const endExclusive = new Date(Date.UTC(startYear + 1, 3, 6));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), endExclusive: iso(endExclusive) };
}

function getCurrentUKTaxYearStartYear(today = new Date()) {
  const y = today.getFullYear();
  const startThisYear = new Date(Date.UTC(y, 3, 6));
  return today >= startThisYear ? y : y - 1;
}

function taxYearLabel(startYear: number) {
  const yy = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${yy}`;
}

// CSV helpers
function csvEscape(v: any) {
  const s = String(v ?? "");
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
function downloadCSV(filename: string, rows: any[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

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

function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const currentStartYear = useMemo(() => getCurrentUKTaxYearStartYear(new Date()), []);
  const [taxYearStart, setTaxYearStart] = useState<number>(currentStartYear);
  const range = useMemo(() => getUKTaxYearRangeForYear(taxYearStart), [taxYearStart]);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState(false);

  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(0);

  // add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);

  const [exDate, setExDate] = useState<string>("");
  const [exAmount, setExAmount] = useState<string>("0");
  const [exCategory, setExCategory] = useState<string>("");
  const [exVendor, setExVendor] = useState<string>("");
  const [exPaidBy, setExPaidBy] = useState<string>("Business");
  const [exNotes, setExNotes] = useState<string>("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setErrorMsg("");

    const offset = page * pageSize;

    const { data, error } = await supabase.rpc("list_expenses_in_range_paged", {
      p_from: range.start,
      p_to: range.endExclusive,
      p_search: debouncedQ || null,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const r = (data ?? []) as ExpenseRow[];
    setRows(r);
    setTotalCount(r.length ? Number(r[0].total_count || 0) : 0);

    setLoading(false);
  }

  async function loadCategoryTotals() {
    const { data, error } = await supabase
      .from("expenses")
      .select("category,amount")
      .gte("expense_date", range.start)
      .lt("expense_date", range.endExclusive);

    if (error || !data) return;

    const totals: Record<string, number> = {};
    for (const row of data as { category: string; amount: number }[]) {
      const cat = row.category || "Other Business Expenses";
      totals[cat] = (totals[cat] ?? 0) + toNum(String(row.amount));
    }
    setCategoryTotals(totals);
  }

  // reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [taxYearStart, debouncedQ, pageSize]);

  useEffect(() => {
    load().catch((e) => {
      setErrorMsg(e?.message ?? "Failed to load expenses");
      setLoading(false);
    });
    loadCategoryTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.endExclusive, debouncedQ, page, pageSize]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  }, [totalCount, pageSize]);

  function exportCurrentPageCSV() {
    const header = ["Date", "Amount", "Category", "Vendor", "Paid by", "Source", "Notes"];
    const lines = rows.map((e) => [
      e.expense_date,
      e.amount,
      e.category,
      e.vendor ?? "",
      e.paid_by,
      e.source_type,
      e.notes ?? "",
    ]);
    downloadCSV(`expenses_${taxYearLabel(taxYearStart)}_page${page + 1}.csv`, [header, ...lines]);
  }

  function openAdd() {
    setErrorMsg("");
    setExDate((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
    setExAmount("0");
    setExCategory("");
    setExVendor("");
    setExPaidBy("Business");
    setExNotes("");
    setAddOpen(true);
  }

  async function saveAdd() {
    setErrorMsg("");
    if (!exDate) return setErrorMsg("Date is required.");
    if (!exCategory.trim()) return setErrorMsg("Category is required.");
    if (!exPaidBy.trim()) return setErrorMsg("Paid by is required.");
    const amount = toNum(exAmount);
    if (!Number.isFinite(amount) || amount <= 0) return setErrorMsg("Amount must be > 0.");

    setAddSaving(true);
    const { error } = await supabase.rpc("create_expense", {
      p_expense_date: exDate,
      p_amount: amount,
      p_category: exCategory.trim(),
      p_paid_by: exPaidBy.trim(),
      p_vendor: exVendor.trim() || null,
      p_notes: exNotes.trim() || null,
      p_source_type: "manual",
      p_source_id: null,
    });
    setAddSaving(false);

    if (error) { setErrorMsg(error.message); return; }

    setAddOpen(false);
    await load(); loadCategoryTotals();
  }

  function openEdit(e: ExpenseRow) {
    setErrorMsg("");
    setEditRow(e);
    setExDate(e.expense_date ?? "");
    setExAmount(String(e.amount ?? 0));
    setExCategory(e.category ?? "");
    setExVendor(e.vendor ?? "");
    setExPaidBy(e.paid_by ?? "Business");
    setExNotes(e.notes ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;

    setErrorMsg("");

    if (!exDate) return setErrorMsg("Date is required.");
    if (!exCategory.trim()) return setErrorMsg("Category is required.");
    if (!exPaidBy.trim()) return setErrorMsg("Paid by is required.");
    const amount = toNum(exAmount);
    if (!Number.isFinite(amount) || amount <= 0) return setErrorMsg("Amount must be > 0.");

    setEditSaving(true);

    const { error } = await supabase.rpc("update_expense", {
      p_expense_id: editRow.id,
      p_expense_date: exDate,
      p_amount: amount,
      p_category: exCategory.trim(),
      p_paid_by: exPaidBy.trim(),
      p_vendor: exVendor.trim() || null,
      p_notes: exNotes.trim() || null,
    });

    setEditSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEditOpen(false);
    setEditRow(null);
    await load(); loadCategoryTotals();
  }

  async function deleteExpense(e: ExpenseRow) {
    setErrorMsg("");
    const ok = window.confirm("Delete this expense? This cannot be undone.");
    if (!ok) return;

    const { error } = await supabase.rpc("delete_expense", {
      p_expense_id: e.id,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // if we deleted the last row on the last page, step back one page
    if (rows.length === 1 && page > 0) setPage((p) => Math.max(0, p - 1));
    else await load(); loadCategoryTotals();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-600 mt-1">Searchable expense log (paged).</p>
        </div>

        <div className="flex items-center gap-3">
          <MonzoImportModal onDone={load} />
          <button
            type="button"
            onClick={openAdd}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            + Add expense
          </button>
          <Link href="/finance" className="text-sm text-gray-600 underline">
            Back to Finance
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">Tax year</div>
          <select
            className="rounded-md border bg-white px-3 py-2 text-sm"
            value={taxYearStart}
            onChange={(e) => setTaxYearStart(Number(e.target.value))}
          >
            {[currentStartYear - 3, currentStartYear - 2, currentStartYear - 1, currentStartYear, currentStartYear + 1].map(
              (y) => (
                <option key={y} value={y}>
                  {taxYearLabel(y)}
                </option>
              )
            )}
          </select>
          <div className="text-xs text-gray-500">
            {range.start} → {range.endExclusive}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">Search</div>
          <input
            className="rounded-md border bg-white px-3 py-2 text-sm w-[260px] max-w-full"
            placeholder="Category, vendor, notes, paid by…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q ? (
            <button
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setQ("")}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="text-xs text-gray-600">Per page</div>
          <select
            className="rounded-md border bg-white px-3 py-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={exportCurrentPageCSV}
            disabled={rows.length === 0}
          >
            Export this page CSV
          </button>
        </div>
      </div>

      {/* Category totals summary */}
      <div className="mb-4 rounded-xl border bg-white shadow-sm">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl"
          onClick={() => setShowSummary((v) => !v)}
        >
          <span>Totals by HMRC category — {taxYearLabel(taxYearStart)}</span>
          <span className="text-gray-400">{showSummary ? "▲" : "▼"}</span>
        </button>

        {showSummary ? (
          <div className="border-t px-4 pb-4 pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2 font-semibold text-gray-700">Category (SA103)</th>
                  <th className="pb-2 font-semibold text-gray-700 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {HMRC_CATEGORIES.filter((c) => (categoryTotals[c] ?? 0) > 0).map((c) => (
                  <tr key={c} className="border-b last:border-b-0">
                    <td className="py-1.5 text-gray-800">{c}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">
                      £{(categoryTotals[c] ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {Object.keys(categoryTotals)
                  .filter((c) => !HMRC_CATEGORIES.includes(c) && (categoryTotals[c] ?? 0) > 0)
                  .map((c) => (
                    <tr key={c} className="border-b last:border-b-0">
                      <td className="py-1.5 text-gray-500 italic">{c}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        £{(categoryTotals[c] ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                <tr className="border-t-2 font-bold">
                  <td className="pt-2 text-gray-900">Total expenses</td>
                  <td className="pt-2 text-right tabular-nums">
                    £{Object.values(categoryTotals).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
            {Object.keys(categoryTotals).length === 0 ? (
              <div className="text-sm text-gray-500 mt-2">No expenses in this tax year.</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Paged table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 border-b bg-gray-50">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Vendor</th>
                <th className="px-3 py-2 font-semibold">Paid by</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-gray-600">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-gray-600">
                    No expenses found.
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const canEdit = (e.source_type ?? "manual") === "manual";
                  return (
                    <tr key={e.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {fmtGBP(Number(e.amount || 0))}
                      </td>
                      <td className="px-3 py-2">{e.category}</td>
                      <td className="px-3 py-2">{e.vendor ?? "—"}</td>
                      <td className="px-3 py-2">{e.paid_by}</td>
                      <td className="px-3 py-2">{e.source_type}</td>
                      <td className="px-3 py-2">{e.notes ?? "—"}</td>

                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {canEdit ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                              onClick={() => openEdit(e)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                              onClick={() => deleteExpense(e)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-3 py-3">
          <div className="text-xs text-gray-600">
            {totalCount ? (
              <>
                Showing <span className="font-semibold">{page * pageSize + 1}</span>–
                <span className="font-semibold">{Math.min((page + 1) * pageSize, totalCount)}</span> of{" "}
                <span className="font-semibold">{totalCount}</span>
              </>
            ) : (
              "—"
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={page <= 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <div className="text-sm text-gray-700">
              Page <span className="font-semibold">{page + 1}</span> /{" "}
              <span className="font-semibold">{pageCount}</span>
            </div>
            <button
              type="button"
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={loading || page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <ModalShell
        open={addOpen}
        title="Add expense"
        onClose={() => { if (addSaving) return; setAddOpen(false); }}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Date</div>
            <input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={exDate} onChange={(e) => setExDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Amount</div>
            <input inputMode="decimal" className="w-full rounded-md border px-3 py-2 text-sm" value={exAmount} onChange={(e) => setExAmount(e.target.value)} />
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Category</div>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={HMRC_CATEGORIES.includes(exCategory) ? exCategory : ""}
              onChange={(e) => setExCategory(e.target.value)}
            >
              <option value="" disabled>Select a category…</option>
              {HMRC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="mt-1 text-[11px] text-gray-500">Categories aligned to HMRC Self Assessment (SA103).</div>
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Vendor</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={exVendor} onChange={(e) => setExVendor(e.target.value)} placeholder="Optional" />
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Paid by</div>
            <select className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={exPaidBy} onChange={(e) => setExPaidBy(e.target.value)}>
              <option>Business</option>
              <option>Carrie</option>
              <option>Vicky</option>
            </select>
          </label>
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Notes</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={exNotes} onChange={(e) => setExNotes(e.target.value)} placeholder="Optional" />
          </label>
          {errorMsg ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div> : null}
          <button type="button" className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={addSaving} onClick={saveAdd}>
            {addSaving ? "Saving…" : "Save expense"}
          </button>
        </div>
      </ModalShell>

      {/* Edit Modal */}
      <ModalShell
        open={editOpen}
        title={editRow ? `Edit expense (${editRow.source_type})` : "Edit expense"}
        onClose={() => {
          if (editSaving) return;
          setEditOpen(false);
          setEditRow(null);
        }}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Date</div>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Amount</div>
            <input
              inputMode="decimal"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={exAmount}
              onChange={(e) => setExAmount(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Category</div>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={HMRC_CATEGORIES.includes(exCategory) ? exCategory : "__custom__"}
              onChange={(e) => setExCategory(e.target.value === "__custom__" ? exCategory : e.target.value)}
            >
              <option value="" disabled>Select a category…</option>
              {HMRC_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              {!HMRC_CATEGORIES.includes(exCategory) && exCategory && (
                <option value="__custom__">{exCategory} (existing)</option>
              )}
            </select>
            <div className="mt-1 text-[11px] text-gray-500">Categories aligned to HMRC Self Assessment (SA103).</div>
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Vendor</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={exVendor}
              onChange={(e) => setExVendor(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Paid by</div>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={exPaidBy}
              onChange={(e) => setExPaidBy(e.target.value)}
            >
              <option>Business</option>
              <option>Carrie</option>
              <option>Vicky</option>
            </select>
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Notes</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={exNotes}
              onChange={(e) => setExNotes(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <button
            type="button"
            className="w-full rounded-md border bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={editSaving}
            onClick={saveEdit}
          >
            {editSaving ? "Saving…" : "Save changes"}
          </button>

          <div className="text-xs text-gray-500">
            Only <strong>manual</strong> expenses can be edited. Purchase-order/system expenses are locked.
          </div>
        </div>
      </ModalShell>
    </main>
  );
}

