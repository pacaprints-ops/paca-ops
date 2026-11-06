"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { fetchAllPages } from "../../lib/fetchAllPages";
import { feeAmount } from "../../lib/money";
import {
  TRADING_START,
  PRE_TRADING_COSTS_FROM,
  taxPeriod,
  tradingTaxYears,
  currentTaxYearStart,
  filingDeadline,
  fmtDateUK,
} from "../../lib/taxPeriods";

type OrderRow = {
  order_no: number;
  order_date: string;
  platform: string | null;
  platform_order_ref: string | null;
  gross_revenue: number | null;
  platform_fees: number | null;
  revenue: number | null;
  is_settled: boolean;
  is_refunded: boolean;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  vendor: string | null;
  notes: string | null;
  paid_by: string;
};

type MileageRow = { id: string; trip_date: string; person: string; miles: number };

type Settings = {
  owners_count: number;
  mileage_rate_first: number;
  mileage_rate_after: number;
  mileage_threshold: number;
};

const PARTNERS = ["Carrie", "Vicky"];

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const gbp = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);
const platformName = (p: string | null) =>
  ({ tiktok: "TikTok Shop", ebay: "eBay", etsy: "Etsy", shopify: "Shopify" } as Record<string, string>)[
    (p ?? "").toLowerCase()
  ] ?? (p || "Unknown");

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCSV(filename: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mileageClaim(miles: number, s: Settings, startYear: number) {
  // HMRC raised the first-10,000-miles rate from 45p to 55p from 6 April 2026
  const first = startYear >= 2026 ? 0.55 : s.mileage_rate_first;
  const a = Math.min(miles, s.mileage_threshold);
  const b = Math.max(0, miles - s.mileage_threshold);
  return a * first + b * s.mileage_rate_after;
}

/** Months (YYYY-MM) a period covers, from the first trading day. */
function monthsIn(from: string, endExclusive: string, today: string) {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const last = (endExclusive < today ? endExclusive : today).slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key > last) break;
    // 6 April end: the April of the end year only has 5 days, still counts as a month worked
    if (`${key}-01` >= endExclusive) break;
    out.push(key);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

type Check = { level: "warn" | "info"; title: string; detail: string };

export default function TaxYearPage() {
  const years = useMemo(() => tradingTaxYears(), []);
  const [startYear, setStartYear] = useState<number>(() => {
    // Default to the oldest year that still needs filing attention: last completed year
    const cur = currentTaxYearStart();
    return Math.max(years[0], cur - 1);
  });
  const period = useMemo(() => taxPeriod(startYear), [startYear]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [olderCosts, setOlderCosts] = useState<ExpenseRow[]>([]);
  const [mileage, setMileage] = useState<MileageRow[]>([]);
  const [settings, setSettings] = useState<Settings>({
    owners_count: 2,
    mileage_rate_first: 0.45,
    mileage_rate_after: 0.25,
    mileage_threshold: 10000,
  });
  const [openCat, setOpenCat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const [ord, exRes, miRes, sRes, oldRes] = await Promise.all([
          fetchAllPages<OrderRow>((from, to) =>
            supabase
              .from("orders")
              .select(
                "order_no,order_date,platform,platform_order_ref,gross_revenue,platform_fees,revenue,is_settled,is_refunded"
              )
              .gte("order_date", period.ordersFrom)
              .lt("order_date", period.endExclusive)
              .order("order_no", { ascending: true })
              .range(from, to)
          ),
          supabase.rpc("list_expenses_in_range", { p_from: period.expensesFrom, p_to: period.endExclusive }),
          supabase.rpc("list_mileage_in_range", { p_from: period.expensesFrom, p_to: period.endExclusive }),
          supabase.rpc("get_finance_settings"),
          period.isFirstPeriod
            ? supabase.rpc("list_expenses_in_range", { p_from: "2000-01-01", p_to: PRE_TRADING_COSTS_FROM })
            : Promise.resolve({ data: [], error: null }),
        ]);
        for (const r of [exRes, miRes, sRes, oldRes]) if (r.error) throw new Error(r.error.message);
        if (cancelled) return;
        setOrders(ord);
        setExpenses((exRes.data ?? []) as ExpenseRow[]);
        setMileage((miRes.data ?? []) as MileageRow[]);
        setOlderCosts((oldRes.data ?? []) as ExpenseRow[]);
        const s = (Array.isArray(sRes.data) ? sRes.data[0] : sRes.data) as Settings | undefined;
        if (s) setSettings(s);
      } catch (e) {
        if (!cancelled) setErrorMsg(e instanceof Error ? e.message : "Failed to load");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const today = new Date().toISOString().slice(0, 10);

  const calc = useMemo(() => {
    const counted = orders.filter((o) => o.is_settled && !o.is_refunded);
    const unsettled = orders.filter((o) => !o.is_settled && !o.is_refunded);
    const refundedWithPayout = orders.filter((o) => o.is_refunded && n(o.revenue) > 0);
    const noGross = counted.filter((o) => n(o.gross_revenue) === 0);

    const byPlatform = new Map<string, { orders: number; payout: number; fees: number; customerPaid: number }>();
    for (const o of counted) {
      const k = platformName(o.platform);
      const row = byPlatform.get(k) ?? { orders: 0, payout: 0, fees: 0, customerPaid: 0 };
      row.orders++;
      row.payout += n(o.revenue);
      row.fees += feeAmount(o.platform_fees);
      row.customerPaid += n(o.gross_revenue);
      byPlatform.set(k, row);
    }
    const payout = counted.reduce((s, o) => s + n(o.revenue), 0);
    const fees = counted.reduce((s, o) => s + feeAmount(o.platform_fees), 0);
    const turnover = payout + fees;
    const customerPaid = counted.reduce((s, o) => s + n(o.gross_revenue), 0);

    const byCategory = new Map<string, ExpenseRow[]>();
    for (const e of expenses) {
      const k = e.category || "Other Business Expenses";
      byCategory.set(k, [...(byCategory.get(k) ?? []), e]);
    }
    const categories = [...byCategory.entries()]
      .map(([name, rows]) => ({
        name,
        rows: rows.slice().sort((a, b) => a.expense_date.localeCompare(b.expense_date)),
        total: rows.reduce((s, e) => s + n(e.amount), 0),
      }))
      .sort((a, b) => b.total - a.total);
    const expensesTotal = expenses.reduce((s, e) => s + n(e.amount), 0);
    const preTrading = period.isFirstPeriod ? expenses.filter((e) => e.expense_date < TRADING_START) : [];

    const totalMiles = mileage.reduce((s, m) => s + n(m.miles), 0);
    const mileageTotal = mileageClaim(totalMiles, settings, startYear);

    const profit = turnover - fees - expensesTotal - mileageTotal;
    const owners = Math.max(1, settings.owners_count || 2);
    const share = profit / owners;

    const partners = PARTNERS.map((p) => {
      const paid = expenses.filter((e) => e.paid_by === p);
      const miles = mileage.filter((m) => m.person === p).reduce((s, m) => s + n(m.miles), 0);
      return {
        name: p,
        share,
        paidPersonally: paid.reduce((s, e) => s + n(e.amount), 0),
        paidRows: paid,
        miles,
        // per-person split of the mileage claim, in proportion to miles driven
        mileageClaim: totalMiles > 0 ? (mileageTotal * miles) / totalMiles : 0,
      };
    });

    // Home Office: expect one entry per month worked
    const months = monthsIn(period.ordersFrom, period.endExclusive, today);
    const homeOffice = expenses.filter((e) => e.category === "Home Office");
    const hoMonths = new Set(homeOffice.map((e) => e.expense_date.slice(0, 7)));
    const missingHO = months.filter((m) => !hoMonths.has(m));

    const futureExpenses = expenses.filter((e) => e.expense_date > today);

    const checks: Check[] = [];
    if (unsettled.length)
      checks.push({
        level: "warn",
        title: `${unsettled.length} order${unsettled.length === 1 ? "" : "s"} not settled yet`,
        detail: `Not counted in turnover until settled (customers paid ${gbp(
          unsettled.reduce((s, o) => s + n(o.gross_revenue), 0)
        )}). Run /orders to settle them. Orders: ${unsettled.map((o) => `#${o.order_no}`).join(", ")}`,
      });
    if (noGross.length)
      checks.push({
        level: "warn",
        title: `${noGross.length} settled order${noGross.length === 1 ? " has" : "s have"} no gross recorded`,
        detail: `Turnover is still right (it uses payout + fees), but the platform fee is probably missing too, so turnover and fees may both read low by the same amount. Check the platform statement: ${noGross
          .map((o) => `#${o.order_no} ${platformName(o.platform)} ${o.platform_order_ref ?? ""}`.trim())
          .join(", ")}`,
      });
    if (missingHO.length)
      checks.push({
        level: "warn",
        title: `Working from home missing for ${missingHO.length} month${missingHO.length === 1 ? "" : "s"}`,
        detail: `Log one Home Office entry per month, using the HMRC band that matches the hours actually worked (25-50 hours = £10, 51-100 = £18, 101+ = £26). Missing: ${missingHO
          .map(monthLabel)
          .join(", ")}.`,
      });
    if (homeOffice.length)
      checks.push({
        level: "info",
        title: "Working from home per partner not confirmed",
        detail:
          "Entries are claimed for both partners. Carrie is asking HMRC whether each partner can claim the flat rate separately. Until confirmed, check with the accountant before filing.",
      });
    if (olderCosts.length)
      checks.push({
        level: "warn",
        title: `${olderCosts.length} cost${olderCosts.length === 1 ? "" : "s"} dated before ${fmtDateUK(
          PRE_TRADING_COSTS_FROM
        )} not counted (${gbp(olderCosts.reduce((s, e) => s + n(e.amount), 0))})`,
        detail: `Pre-trading costs can count on the first day of trading if they were for the business. Ask the accountant whether these should be added: ${olderCosts
          .map((e) => `${fmtDateUK(e.expense_date)} ${e.vendor ?? e.category} ${gbp(n(e.amount))}`)
          .join("; ")}`,
      });
    if (futureExpenses.length)
      checks.push({
        level: "info",
        title: `${futureExpenses.length} future-dated expense${futureExpenses.length === 1 ? "" : "s"} included`,
        detail: `${gbp(futureExpenses.reduce((s, e) => s + n(e.amount), 0))} dated after today. Profit reads low until those dates pass.`,
      });
    if (refundedWithPayout.length)
      checks.push({
        level: "info",
        title: `${refundedWithPayout.length} refunded order${refundedWithPayout.length === 1 ? "" : "s"} with a payout`,
        detail: `Left out of turnover (${gbp(
          refundedWithPayout.reduce((s, o) => s + n(o.revenue), 0)
        )}). If the platform kept any money after the refund, it should be counted: ${refundedWithPayout
          .map((o) => `#${o.order_no}`)
          .join(", ")}`,
      });

    return {
      counted,
      byPlatform: [...byPlatform.entries()].sort((a, b) => b[1].payout - a[1].payout),
      payout,
      fees,
      turnover,
      customerPaid,
      categories,
      expensesTotal,
      preTrading,
      totalMiles,
      mileageTotal,
      profit,
      owners,
      share,
      partners,
      checks,
    };
  }, [orders, expenses, olderCosts, mileage, settings, startYear, period, today]);

  function exportForAccountant() {
    const rows: unknown[][] = [
      [`Paca Prints partnership — ${period.label}`],
      ["Period", `${fmtDateUK(period.ordersFrom)} to ${fmtDateUK(period.endInclusive)}`],
      ["Basis", "Cash basis. Turnover = platform payout + platform fees. Costs from the expenses log only."],
      [],
      ["Turnover", calc.turnover.toFixed(2)],
      ["Platform fees", calc.fees.toFixed(2)],
      ...calc.categories.map((c) => [`Expenses: ${c.name}`, c.total.toFixed(2)]),
      ["Mileage claim", calc.mileageTotal.toFixed(2), `${calc.totalMiles} miles`],
      ["Net profit", calc.profit.toFixed(2)],
      ...calc.partners.map((p) => [`Profit share: ${p.name}`, p.share.toFixed(2)]),
      [],
      ["Turnover by platform", "Orders", "Payout", "Fees", "Turnover"],
      ...calc.byPlatform.map(([k, v]) => [k, v.orders, v.payout.toFixed(2), v.fees.toFixed(2), (v.payout + v.fees).toFixed(2)]),
      [],
      ["Expense date", "Amount", "Category", "Vendor", "Paid by", "Notes"],
      ...expenses
        .slice()
        .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
        .map((e) => [e.expense_date, n(e.amount).toFixed(2), e.category, e.vendor ?? "", e.paid_by, e.notes ?? ""]),
    ];
    downloadCSV(`paca-tax-${period.label}.csv`, rows);
  }

  const warnCount = calc.checks.filter((c) => c.level === "warn").length;

  return (
    <main className="pp-container py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tax Year</h1>
          <p className="text-sm text-slate-500">
            Everything needed for the partnership return (SA800) and each partner&apos;s own return.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="pp-select"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {taxPeriod(y).label}
              </option>
            ))}
          </select>
          <button type="button" className="pp-btn pp-btn-secondary" onClick={exportForAccountant} disabled={loading}>
            Export for accountant
          </button>
          <Link href="/finance" className="text-sm text-slate-600 underline">
            Finance
          </Link>
        </div>
      </div>

      {errorMsg ? <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div> : null}

      <div className="pp-card p-4 text-sm text-slate-700 grid gap-2 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Period</div>
          {fmtDateUK(period.ordersFrom)} – {fmtDateUK(period.endInclusive)}
          {period.isFirstPeriod ? <span className="text-slate-500"> (first period)</span> : null}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">Returns needed</div>
          SA800 partnership return, plus Carrie and Vicky each file their own return with the partnership
          pages (Carrie also adds employment pages from her P60).
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">Deadline (online)</div>
          {filingDeadline(startYear)}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : (
        <>
          {/* HEADLINE FIGURES */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Turnover" value={gbp(calc.turnover)} sub="Payout + platform fees" />
            <Stat label="Platform fees" value={gbp(calc.fees)} sub="Kept by TikTok, Etsy etc." />
            <Stat
              label="Expenses"
              value={gbp(calc.expensesTotal + calc.mileageTotal)}
              sub={calc.mileageTotal > 0 ? `incl. mileage ${gbp(calc.mileageTotal)}` : "From the expenses log"}
            />
            <Stat label="Net profit" value={gbp(calc.profit)} sub="Turnover − fees − expenses" strong />
            <Stat label="Each partner" value={gbp(calc.share)} sub={`${calc.owners} partners, equal split`} strong />
          </section>

          {/* CHECKS */}
          <section className="pp-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Before you file</h2>
              <span
                className={`pp-pill ${warnCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
              >
                {warnCount ? `${warnCount} to sort` : "All clear"}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {calc.checks.map((c, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    c.level === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="font-semibold text-slate-900">
                    {c.level === "warn" ? "⚠️ " : "ℹ️ "}
                    {c.title}
                  </div>
                  <div className="mt-0.5 text-slate-600">{c.detail}</div>
                </li>
              ))}
              <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="font-semibold text-slate-900">ℹ️ No £1,000 trading allowance</div>
                <div className="mt-0.5 text-slate-600">
                  It can&apos;t be used for partnership income. Every year with sales needs a partnership return,
                  however small the profit.
                </div>
              </li>
            </ul>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* TURNOVER */}
            <section className="pp-card p-5">
              <h2 className="text-base font-extrabold text-slate-900">Turnover by platform</h2>
              <p className="text-xs text-slate-500">
                What each platform owed Paca before its fees. Settled orders only, refunds left out.
              </p>
              <div className="pp-table mt-3">
                <table>
                  <thead>
                    <tr>
                      <th className="text-left">Platform</th>
                      <th className="text-right">Orders</th>
                      <th className="text-right">Payout</th>
                      <th className="text-right">Fees</th>
                      <th className="text-right">Turnover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.byPlatform.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="text-right">{v.orders}</td>
                        <td className="text-right">{gbp(v.payout)}</td>
                        <td className="text-right">{gbp(v.fees)}</td>
                        <td className="text-right font-semibold">{gbp(v.payout + v.fees)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="text-right">{calc.counted.length}</td>
                      <td className="text-right">{gbp(calc.payout)}</td>
                      <td className="text-right">{gbp(calc.fees)}</td>
                      <td className="text-right">{gbp(calc.turnover)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Customers paid {gbp(calc.customerPaid)} in total. Turnover is higher where a platform funded a
                discount (TikTok) — Paca is taxed on what the platform paid, not on the customer price.
              </p>
            </section>

            {/* EXPENSES */}
            <section className="pp-card p-5">
              <h2 className="text-base font-extrabold text-slate-900">Expenses</h2>
              <p className="text-xs text-slate-500">
                From the expenses log only (actual spend with receipts). Order-level postage and stock costs are a
                margin view and are not used for tax. Tap a row to see the items.
              </p>
              <div className="mt-3 divide-y rounded-lg border">
                {calc.categories.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">No expenses in this period.</div>
                ) : null}
                {calc.categories.map((c) => (
                  <div key={c.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => setOpenCat(openCat === c.name ? null : c.name)}
                    >
                      <span>
                        <span className="text-slate-400">{openCat === c.name ? "▾" : "▸"}</span> {c.name}
                        <span className="text-xs text-slate-400"> · {c.rows.length}</span>
                      </span>
                      <span className="font-semibold">{gbp(c.total)}</span>
                    </button>
                    {openCat === c.name ? (
                      <div className="bg-slate-50 px-3 pb-2">
                        {c.rows.map((e) => (
                          <div key={e.id} className="flex justify-between gap-2 py-1 text-xs text-slate-600">
                            <span>
                              {fmtDateUK(e.expense_date)} · {e.vendor ?? "—"}
                              {e.paid_by !== "Business" ? ` · paid by ${e.paid_by}` : ""}
                              {e.expense_date < TRADING_START ? " · pre-trading" : ""}
                            </span>
                            <span>{gbp(n(e.amount))}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {calc.mileageTotal > 0 ? (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span>Mileage ({calc.totalMiles} miles)</span>
                    <span className="font-semibold">{gbp(calc.mileageTotal)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between bg-slate-50 px-3 py-2 text-sm font-extrabold">
                  <span>Total</span>
                  <span>{gbp(calc.expensesTotal + calc.mileageTotal)}</span>
                </div>
              </div>
              {calc.preTrading.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  Includes {gbp(calc.preTrading.reduce((s, e) => s + n(e.amount), 0))} bought before trading
                  started ({fmtDateUK(TRADING_START)}), counted on the first day of trading.
                </p>
              ) : null}
            </section>
          </div>

          {/* PARTNERS */}
          <section className="pp-card p-5">
            <h2 className="text-base font-extrabold text-slate-900">Partners</h2>
            <p className="text-xs text-slate-500">
              Each partner reports their own share on their return (partnership pages). Costs paid personally are
              still business costs — they&apos;re already in the totals above and are money the business owes back
              (or money put into the business).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {calc.partners.map((p) => (
                <div key={p.name} className="rounded-lg border p-4">
                  <div className="text-sm font-extrabold text-slate-900">{p.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Profit share</div>
                      <div className="font-semibold">{gbp(p.share)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Paid personally</div>
                      <div className="font-semibold">{gbp(p.paidPersonally + p.mileageClaim)}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.paidRows.length} expense{p.paidRows.length === 1 ? "" : "s"}
                        {p.miles ? ` + ${p.miles} miles` : ""}
                      </div>
                    </div>
                  </div>
                  {p.paidRows.length ? (
                    <div className="mt-2 border-t pt-2 text-xs text-slate-600">
                      {p.paidRows.map((e) => (
                        <div key={e.id} className="flex justify-between">
                          <span>
                            {fmtDateUK(e.expense_date)} · {e.vendor ?? e.category}
                          </span>
                          <span>{gbp(n(e.amount))}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              For each partner&apos;s tax estimate, see the{" "}
              <Link href="/admin/tax/carrie" className="underline">
                Carrie
              </Link>{" "}
              and{" "}
              <Link href="/admin/tax/vicky" className="underline">
                Vicky
              </Link>{" "}
              tax calculators.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={strong ? "pp-card-strong" : "pp-card"}>
      <div className="pp-stat">
        <div className="pp-stat-label">{label}</div>
        <div className="pp-stat-value">{value}</div>
        {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}
