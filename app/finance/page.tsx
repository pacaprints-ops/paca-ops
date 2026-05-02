"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type FinanceSettings = {
  owners_count: number;
  est_tax_rate: number; // 0.20
  mileage_rate_first: number; // 0.45
  mileage_rate_after: number; // 0.25
  mileage_threshold: number; // 10000
};

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
};

type MileageRow = {
  id: string;
  trip_date: string;
  person: string;
  start_location: string | null;
  end_location: string | null;
  miles: number;
  notes: string | null;
  created_at: string;
};

type OrdersSummary = {
  gross_revenue: any;
  platform_fees: any;
  payout: any;
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

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const currentStartYear = useMemo(() => getCurrentUKTaxYearStartYear(new Date()), []);
  const [taxYearStart, setTaxYearStart] = useState<number>(currentStartYear);
  const range = useMemo(() => getUKTaxYearRangeForYear(taxYearStart), [taxYearStart]);

  const [settings, setSettings] = useState<FinanceSettings | null>(null);

  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary>({
    gross_revenue: 0,
    platform_fees: 0,
    payout: 0,
  });

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [mileage, setMileage] = useState<MileageRow[]>([]);

  // add expense modal
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [exDate, setExDate] = useState<string>(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
  const [exAmount, setExAmount] = useState<string>("0");
  const [exCategory, setExCategory] = useState<string>("");
  const [exVendor, setExVendor] = useState<string>("");
  const [exPaidBy, setExPaidBy] = useState<string>("Business");
  const [exNotes, setExNotes] = useState<string>("");
  const [exSaving, setExSaving] = useState(false);

  // add trip modal
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [trDate, setTrDate] = useState<string>(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
  const [trPerson, setTrPerson] = useState<string>("Carrie");
  const [trFrom, setTrFrom] = useState<string>("");
  const [trTo, setTrTo] = useState<string>("");
  const [trMiles, setTrMiles] = useState<string>("0");
  const [trNotes, setTrNotes] = useState<string>("");
  const [trSaving, setTrSaving] = useState(false);

  // totals
  const expensesTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const totalMiles = useMemo(
    () => mileage.reduce((sum, r) => sum + Number(r.miles || 0), 0),
    [mileage]
  );

  function claimForMiles(miles: number, s: FinanceSettings) {
    const firstMiles = Math.min(miles, s.mileage_threshold);
    const afterMiles = Math.max(0, miles - s.mileage_threshold);
    return firstMiles * s.mileage_rate_first + afterMiles * s.mileage_rate_after;
  }

  const mileageClaimTotal = useMemo(() => {
    if (!settings) return 0;
    return claimForMiles(totalMiles, settings);
  }, [totalMiles, settings]);

  const gross = Number(ordersSummary.gross_revenue ?? 0) || 0;
  const fees = Number(ordersSummary.platform_fees ?? 0) || 0;
  const payout = Number(ordersSummary.payout ?? 0) || 0;

  // YOUR TAX MODEL (no COGS subtraction here because stock/shipping are already in expenses)
  const profit = useMemo(() => {
    return gross - fees - (expensesTotal + mileageClaimTotal);
  }, [gross, fees, expensesTotal, mileageClaimTotal]);

  const taxPot = useMemo(() => {
    if (!settings) return null;
    const owners = Math.max(1, settings.owners_count || 2);
    const perOwnerProfit = profit / owners;

    // don’t show negative “tax owed”
    const taxableEach = Math.max(0, perOwnerProfit);
    const estTaxEach = taxableEach * (settings.est_tax_rate || 0.2);
    const estTaxTotal = estTaxEach * owners;

    return { owners, perOwnerProfit, estTaxEach, estTaxTotal };
  }, [profit, settings]);

  async function loadAll() {
    setLoading(true);
    setErrorMsg("");

    // settings
    const { data: sData, error: sErr } = await supabase.rpc("get_finance_settings");
    if (sErr) {
      setErrorMsg(sErr.message);
      setLoading(false);
      return;
    }
    const s = (Array.isArray(sData) ? sData[0] : sData) as FinanceSettings | undefined;
    const safeSettings: FinanceSettings = s ?? {
      owners_count: 2,
      est_tax_rate: 0.2,
      mileage_rate_first: 0.45,
      mileage_rate_after: 0.25,
      mileage_threshold: 10000,
    };
    setSettings(safeSettings);

    // orders summary — settled only, so tax reflects money actually received
    const { data: oData, error: oErr } = await supabase.rpc("finance_orders_summary", {
      p_from: range.start,
      p_to: range.endExclusive,
      p_platform: null,
      p_settled_only: true,
    });
    if (oErr) {
      setErrorMsg(oErr.message);
      setLoading(false);
      return;
    }
    const os = (Array.isArray(oData) ? oData[0] : oData) as OrdersSummary | undefined;
    setOrdersSummary({
      gross_revenue: Number(os?.gross_revenue ?? 0),
      platform_fees: Number(os?.platform_fees ?? 0),
      payout: Number(os?.payout ?? 0),
    });

    // expenses
    const { data: eData, error: eErr } = await supabase.rpc("list_expenses_in_range", {
      p_from: range.start,
      p_to: range.endExclusive,
    });
    if (eErr) {
      setErrorMsg(eErr.message);
      setLoading(false);
      return;
    }
    setExpenses((eData ?? []) as ExpenseRow[]);

    // mileage
    const { data: mData, error: mErr } = await supabase.rpc("list_mileage_in_range", {
      p_from: range.start,
      p_to: range.endExclusive,
    });
    if (mErr) {
      setErrorMsg(mErr.message);
      setLoading(false);
      return;
    }
    setMileage((mData ?? []) as MileageRow[]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll().catch((e) => {
      setErrorMsg(e?.message ?? "Failed to load finance");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.endExclusive]);

  function exportExpensesCSV() {
    const header = ["Date", "Amount", "Category", "Vendor", "Paid by", "Source", "Notes"];
    const lines = expenses.map((e) => [
      e.expense_date,
      e.amount,
      e.category,
      e.vendor ?? "",
      e.paid_by,
      e.source_type,
      e.notes ?? "",
    ]);
    downloadCSV(`expenses_${taxYearLabel(taxYearStart)}.csv`, [header, ...lines]);
  }

  function exportMileageCSV() {
    const header = ["Date", "Person", "From", "To", "Miles", "Notes"];
    const lines = mileage.map((m) => [
      m.trip_date,
      m.person,
      m.start_location ?? "",
      m.end_location ?? "",
      m.miles,
      m.notes ?? "",
    ]);
    downloadCSV(`mileage_${taxYearLabel(taxYearStart)}.csv`, [header, ...lines]);
  }

  async function saveExpense() {
    setErrorMsg("");
    const amount = Number(exAmount);
    if (!exDate) return setErrorMsg("Expense date is required.");
    if (!Number.isFinite(amount) || amount <= 0) return setErrorMsg("Amount must be > 0.");
    if (!exCategory.trim()) return setErrorMsg("Category is required.");
    if (!exPaidBy.trim()) return setErrorMsg("Paid by is required.");

    setExSaving(true);
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
    setExSaving(false);

    if (error) return setErrorMsg(error.message);

    setAddExpenseOpen(false);
    await loadAll();
  }

  async function saveTrip() {
    setErrorMsg("");
    const miles = Number(trMiles);
    if (!trDate) return setErrorMsg("Trip date is required.");
    if (!trPerson.trim()) return setErrorMsg("Person is required.");
    if (!Number.isFinite(miles) || miles <= 0) return setErrorMsg("Miles must be > 0.");

    setTrSaving(true);
    const { error } = await supabase.rpc("create_mileage_log", {
      p_trip_date: trDate,
      p_person: trPerson.trim(),
      p_miles: miles,
      p_start_location: trFrom.trim() || null,
      p_end_location: trTo.trim() || null,
      p_notes: trNotes.trim() || null,
    });
    setTrSaving(false);

    if (error) return setErrorMsg(error.message);

    setAddTripOpen(false);
    await loadAll();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-600 mt-1">Tax tracker, expenses log, mileage log.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-600 underline">
            Dashboard
          </Link>
          <Link href="/purchases" className="text-sm text-gray-600 underline">
            Purchases
          </Link>
          <Link href="/materials" className="text-sm text-gray-600 underline">
            Materials
          </Link>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* TAX */}
          <section className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tax tracker</h2>

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
                  {range.start} → {range.endExclusive} (end excl.)
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Box 1 · Gross revenue</div>
                <div className="text-sm font-semibold">{fmtGBP(gross)}</div>
              </div>

              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Box 2 · Platform fees</div>
                <div className="text-sm font-semibold">{fmtGBP(fees)}</div>
              </div>

              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Box 3 · Expenses + mileage</div>
                <div className="text-sm font-semibold">{fmtGBP(expensesTotal + mileageClaimTotal)}</div>
                <div className="text-[11px] text-gray-500">
                  Expenses {fmtGBP(expensesTotal)} + Mileage {fmtGBP(mileageClaimTotal)}
                </div>
              </div>

              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Box 4 · Profit</div>
                <div className="text-sm font-semibold">{fmtGBP(profit)}</div>
              </div>

              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Box 5 · Est. tax owed</div>
                <div className="text-sm font-semibold">
                  {fmtGBP(taxPot?.estTaxTotal ?? 0)}
                </div>
                <div className="text-[11px] text-gray-500">
                  Each: {fmtGBP(taxPot?.estTaxEach ?? 0)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Payout (net received) for reference: <span className="font-semibold">{fmtGBP(payout)}</span>
              {" "}· Profit excludes refunded orders.
            </div>
          </section>

          {/* EXPENSES */}
<section className="rounded-lg border bg-white p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>

    <div className="flex flex-wrap gap-2">
      <Link
        href="/finance/expenses"
        className="text-sm rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
      >
        View all (search)
      </Link>

      <button
        type="button"
        className="text-sm rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
        onClick={() => setAddExpenseOpen(true)}
      >
        Add expense
      </button>

      <button
        type="button"
        className="text-sm rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
        onClick={exportExpensesCSV}
        disabled={expenses.length === 0}
      >
        Export expenses CSV
      </button>
    </div>
  </div>

  {expenses.length === 0 ? (
    <div className="text-sm text-gray-600 mt-2">No expenses in this tax year.</div>
  ) : (
    <>
      <div className="mt-2 text-xs text-gray-600">
        Showing last 10 of <span className="font-semibold">{expenses.length}</span> (full searchable log in “View all”)
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border max-h-[340px] overflow-y-auto">
        <table className="min-w-full text-sm bg-white">
          <thead className="sticky top-0 border-b bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Vendor</th>
              <th className="px-3 py-2 font-semibold">Paid by</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {expenses
              .slice()
              .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1))
              .slice(0, 10)
              .map((e) => (
                <tr key={e.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{fmtDate(e.expense_date)}</td>
                  <td className="px-3 py-2 font-semibold">{fmtGBP(Number(e.amount || 0))}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="px-3 py-2">{e.vendor ?? "—"}</td>
                  <td className="px-3 py-2">{e.paid_by}</td>
                  <td className="px-3 py-2">{e.source_type}</td>
                  <td className="px-3 py-2">{e.notes ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</section>


          {/* MILEAGE */}
          <section className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Mileage</h2>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-sm rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
                  onClick={() => setAddTripOpen(true)}
                >
                  Add trip
                </button>

                <button
                  type="button"
                  className="text-sm rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                  onClick={exportMileageCSV}
                  disabled={mileage.length === 0}
                >
                  Export mileage CSV
                </button>
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-700">
              Total miles (tax year): <strong>{totalMiles}</strong> · Estimated claim:{" "}
              <strong>{fmtGBP(mileageClaimTotal)}</strong>
            </div>

            {mileage.length === 0 ? (
              <div className="text-sm text-gray-600 mt-2">No mileage in this tax year.</div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm bg-white">
                  <thead className="border-b bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Person</th>
                      <th className="px-3 py-2 font-semibold">From</th>
                      <th className="px-3 py-2 font-semibold">To</th>
                      <th className="px-3 py-2 font-semibold">Miles</th>
                      <th className="px-3 py-2 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mileage.map((m) => (
                      <tr key={m.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{fmtDate(m.trip_date)}</td>
                        <td className="px-3 py-2">{m.person}</td>
                        <td className="px-3 py-2">{m.start_location ?? "—"}</td>
                        <td className="px-3 py-2">{m.end_location ?? "—"}</td>
                        <td className="px-3 py-2">{Number(m.miles || 0)}</td>
                        <td className="px-3 py-2">{m.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Expense Modal */}
      <ModalShell open={addExpenseOpen} title="Add expense" onClose={() => setAddExpenseOpen(false)}>
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
              value={HMRC_CATEGORIES.includes(exCategory) ? exCategory : ""}
              onChange={(e) => setExCategory(e.target.value)}
            >
              <option value="" disabled>Select a category…</option>
              {HMRC_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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
            disabled={exSaving}
            onClick={saveExpense}
          >
            {exSaving ? "Saving…" : "Save expense"}
          </button>
        </div>
      </ModalShell>

      {/* Add Trip Modal */}
      <ModalShell open={addTripOpen} title="Add trip" onClose={() => setAddTripOpen(false)}>
        <div className="space-y-3">
          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Date</div>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={trDate}
              onChange={(e) => setTrDate(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Person</div>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={trPerson}
              onChange={(e) => setTrPerson(e.target.value)}
            >
              <option>Carrie</option>
              <option>Vicky</option>
            </select>
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">From</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={trFrom}
              onChange={(e) => setTrFrom(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">To</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={trTo}
              onChange={(e) => setTrTo(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Miles</div>
            <input
              inputMode="decimal"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={trMiles}
              onChange={(e) => setTrMiles(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <div className="text-xs font-medium text-gray-700 mb-1">Notes</div>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={trNotes}
              onChange={(e) => setTrNotes(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <button
            type="button"
            className="w-full rounded-md border bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={trSaving}
            onClick={saveTrip}
          >
            {trSaving ? "Saving…" : "Save trip"}
          </button>
        </div>
      </ModalShell>
    </main>
  );
}
