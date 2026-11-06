"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { taxPeriod, tradingTaxYears, currentTaxYearStart, fmtDateUK } from "../../../lib/taxPeriods";

/**
 * Monthly running costs of the business — read straight from the Expenses log,
 * so there's nothing to keep up to date here.
 *
 * Left out by default: costs already tied to orders (Postage & Packaging, Supplies/stock)
 * and Home Office (an HMRC flat-rate allowance, not money paid out).
 */

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  vendor: string | null;
  notes: string | null;
  paid_by: string;
};

const ORDER_LINKED = ["Postage & Packaging", "Supplies", "Home Office"];

const gbp = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const vendorName = (e: ExpenseRow) => (e.vendor?.trim() ? e.vendor.trim() : e.category);
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default function PlatformCosts() {
  const years = useMemo(() => tradingTaxYears(), []);
  const [startYear, setStartYear] = useState(currentTaxYearStart());
  const period = useMemo(() => taxPeriod(startYear), [startYear]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [includeOrderLinked, setIncludeOrderLinked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase.rpc("list_expenses_in_range", {
        p_from: period.expensesFrom,
        p_to: period.endExclusive,
      });
      if (cancelled) return;
      if (error) setErrorMsg(error.message);
      setRows((data ?? []) as ExpenseRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const today = new Date().toISOString().slice(0, 10);

  const view = useMemo(() => {
    const shown = rows.filter((e) => includeOrderLinked || !ORDER_LINKED.includes(e.category));
    const past = shown.filter((e) => e.expense_date <= today);

    const byMonth = new Map<string, ExpenseRow[]>();
    for (const e of shown) {
      const k = e.expense_date.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
    }
    const months = [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, list]) => {
        // group the month's lines by vendor so "Shopify" shows once with its total
        const byVendor = new Map<string, { total: number; lines: ExpenseRow[]; category: string }>();
        for (const e of list) {
          const k = titleCase(vendorName(e).toLowerCase());
          const v = byVendor.get(k) ?? { total: 0, lines: [], category: e.category };
          v.total += n(e.amount);
          v.lines.push(e);
          byVendor.set(k, v);
        }
        return {
          ym,
          total: list.reduce((s, e) => s + n(e.amount), 0),
          future: ym > today.slice(0, 7),
          vendors: [...byVendor.entries()].sort((a, b) => b[1].total - a[1].total),
        };
      });

    const pastMonths = new Set(past.map((e) => e.expense_date.slice(0, 7)));
    const pastTotal = past.reduce((s, e) => s + n(e.amount), 0);

    const byVendor = new Map<string, number>();
    for (const e of past) {
      const k = titleCase(vendorName(e).toLowerCase());
      byVendor.set(k, (byVendor.get(k) ?? 0) + n(e.amount));
    }

    const byCategory = new Map<string, number>();
    for (const e of past) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + n(e.amount));

    return {
      months,
      pastTotal,
      avg: pastMonths.size ? pastTotal / pastMonths.size : 0,
      monthCount: pastMonths.size,
      vendors: [...byVendor.entries()].sort((a, b) => b[1] - a[1]),
      categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows, includeOrderLinked, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select className="pp-select" value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              Tax year {taxPeriod(y).label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeOrderLinked}
            onChange={(e) => setIncludeOrderLinked(e.target.checked)}
          />
          Include postage, stock and home office
        </label>
        <Link href="/finance/expenses" className="text-sm text-slate-600 underline">
          Add or edit in Expenses
        </Link>
      </div>

      {errorMsg ? <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div> : null}

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="pp-card-strong">
              <div className="pp-stat">
                <div className="pp-stat-label">Spent so far this year</div>
                <div className="pp-stat-value">{gbp(view.pastTotal)}</div>
                <div className="text-xs text-slate-500">{view.monthCount} months with costs</div>
              </div>
            </div>
            <div className="pp-card">
              <div className="pp-stat">
                <div className="pp-stat-label">Average a month</div>
                <div className="pp-stat-value">{gbp(view.avg)}</div>
                <div className="text-xs text-slate-500">What the business needs to cover</div>
              </div>
            </div>
            <div className="pp-card">
              <div className="pp-stat">
                <div className="pp-stat-label">Biggest cost</div>
                <div className="pp-stat-value text-lg">{view.vendors[0]?.[0] ?? "—"}</div>
                <div className="text-xs text-slate-500">
                  {view.vendors[0] ? `${gbp(view.vendors[0][1])} this year` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="pp-card p-5 lg:col-span-2">
              <h2 className="text-base font-extrabold text-slate-900">Month by month</h2>
              <p className="text-xs text-slate-500">Tap a month to see what it was spent on.</p>
              <div className="mt-3 divide-y rounded-lg border">
                {view.months.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">No business costs in this tax year.</div>
                ) : null}
                {view.months.map((m) => (
                  <div key={m.ym}>
                    <button
                      type="button"
                      onClick={() => setOpen(open === m.ym ? null : m.ym)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">
                        <span className="text-slate-400">{open === m.ym ? "▾" : "▸"}</span> {monthLabel(m.ym)}
                        {m.future ? <span className="ml-2 text-xs font-normal text-amber-700">upcoming</span> : null}
                      </span>
                      <span className="font-extrabold">{gbp(m.total)}</span>
                    </button>
                    {open === m.ym ? (
                      <div className="bg-slate-50 px-3 pb-3">
                        {m.vendors.map(([vendor, v]) => (
                          <div key={vendor} className="border-b border-slate-200 py-1.5 last:border-b-0">
                            <div className="flex justify-between text-sm">
                              <span>
                                {vendor} <span className="text-xs text-slate-400">· {v.category}</span>
                              </span>
                              <span className="font-semibold">{gbp(v.total)}</span>
                            </div>
                            {v.lines.length > 1 || v.lines[0].notes ? (
                              <div className="mt-0.5 space-y-0.5">
                                {v.lines.map((e) => (
                                  <div key={e.id} className="flex justify-between text-xs text-slate-500">
                                    <span>
                                      {fmtDateUK(e.expense_date)}
                                      {e.notes ? ` · ${e.notes}` : ""}
                                      {e.paid_by !== "Business" ? ` · paid by ${e.paid_by}` : ""}
                                    </span>
                                    <span>{gbp(n(e.amount))}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="pp-card p-5">
              <h2 className="text-base font-extrabold text-slate-900">This year by supplier</h2>
              <div className="mt-3 space-y-1 text-sm">
                {view.vendors.map(([v, total]) => (
                  <div key={v} className="flex justify-between">
                    <span>{v}</span>
                    <span className="font-semibold">{gbp(total)}</span>
                  </div>
                ))}
              </div>
              <h2 className="mt-6 text-base font-extrabold text-slate-900">By category</h2>
              <div className="mt-3 space-y-1 text-sm">
                {view.categories.map(([c, total]) => (
                  <div key={c} className="flex justify-between">
                    <span>{c}</span>
                    <span className="font-semibold">{gbp(total)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
