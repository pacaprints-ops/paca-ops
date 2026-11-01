// pacaprints-ops/app/dashboard/DashboardSummary.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchAllPages } from "../lib/fetchAllPages";
import { seasonalEvents } from "../seasonal/events";

type DashboardSummaryRow = {
  from_date: string;
  to_date: string;
  platform: string | null;
  revenue: number; // payout (net received)
  cogs: number; // product/material cost
  profit: number;
  order_count: number;
  stock_value: number;
};

type OrderRow = {
  order_date: string;
  platform: string | null;
  revenue: number | string | null; // payout (net received) — raw orders column
  gross_revenue: number | string | null; // what the customer paid
  total_cost: number | string | null;
  cogs_override: number | string | null;
  shipping_cost: number | string | null;
  is_settled?: boolean | null;
};

type ProductRow = {
  product_name: string;
  units_sold: number | string | null;
  revenue_allocated: number | string | null;
};

type Totals = {
  orders: number;
  revenue: number;
  cost: number;
  profit: number;
  awaitingOrders: number;
  awaitingValue: number;
};

const ORDER_FIELDS =
  "order_date,platform,revenue,gross_revenue,total_cost,cogs_override,shipping_cost,is_settled";

// From docs/business-plan.md. Revenue is payout, matching the plan's Q1 figure (£3,453 vs
// £3,463 here). Quarters follow the plan's seasonal shape, so pace isn't a flat 1/12 a month.
const TARGETS: Record<number, { revenue: number; profit: number; quarters: number[] }> = {
  2026: { revenue: 12000, profit: 7000, quarters: [3453, 2500, 1500, 4500] },
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  etsy: "Etsy",
  ebay: "eBay",
  shopify: "Shopify",
};

function platformLabel(p: string | null) {
  if (!p) return "Unknown";
  return PLATFORM_LABELS[p] ?? p;
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
/**
 * Cost of goods for one order, matching the Orders page exactly:
 * a per-order override wins, otherwise the stored recipe cost.
 */
function orderCogs(r: any) {
  return r?.cogs_override != null ? toNumber(r.cogs_override) : toNumber(r?.total_cost);
}

function toNumber(v: any) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}
function formatGBP(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}
function formatGBPWhole(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
function formatInt(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value ?? 0);
}
function monthLabel(i: number) {
  return new Date(2000, i, 1).toLocaleString("en-GB", { month: "short" });
}
function monthLongLabel(i: number) {
  return new Date(2000, i, 1).toLocaleString("en-GB", { month: "long" });
}

function formatUKDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function daysUntil(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** First to last day (inclusive) of a month, optionally cut to its first `days` days. Month may be out of range. */
function monthPeriod(year: number, month: number, days?: number) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = new Date(first.getFullYear(), first.getMonth(), Math.min(days ?? lastDay, lastDay));
  return { from: isoDate(first), to: isoDate(to) };
}

function ordersBetween(rows: OrderRow[], from: string, to: string) {
  return rows.filter((r) => {
    const d = r.order_date.slice(0, 10);
    return d >= from && d <= to;
  });
}

function totalsFor(rows: OrderRow[]): Totals {
  const t: Totals = { orders: 0, revenue: 0, cost: 0, profit: 0, awaitingOrders: 0, awaitingValue: 0 };

  for (const r of rows) {
    // Profit is calculated here rather than read from the stored gross_profit
    // column, which is written once at entry and goes stale whenever payout,
    // postage or cost is corrected afterwards — it disagreed with the per-order
    // figures on 997 of 1,603 orders and overstated TY 25/26 by £768.
    //
    // "Cost" is COGS + postage everywhere on this page, so Profit = Revenue - Cost.
    const revenue = toNumber(r.revenue);
    const cost = orderCogs(r) + toNumber(r.shipping_cost);
    t.orders += 1;
    t.revenue += revenue;
    t.cost += cost;
    t.profit += revenue - cost;

    // Payout stays 0 until the platform settles, so recent periods read low until then.
    if (!r.is_settled && revenue === 0) {
      t.awaitingOrders += 1;
      t.awaitingValue += toNumber(r.gross_revenue);
    }
  }

  return t;
}

/** How much revenue the plan expects by `today`, walking through its quarters. */
function expectedRevenue(today: Date, quarters: number[]) {
  const q = Math.floor(today.getMonth() / 3);
  const start = new Date(today.getFullYear(), q * 3, 1).getTime();
  const end = new Date(today.getFullYear(), q * 3 + 3, 1).getTime();
  const fraction = (today.getTime() - start) / (end - start);
  const completed = quarters.slice(0, q).reduce((acc, v) => acc + v, 0);
  return completed + quarters[q] * fraction;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          const escaped = s.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

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

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="pp-card-strong">
      <div className="pp-stat">
        <div className="pp-stat-label">{title}</div>
        <div className="pp-stat-value min-h-[44px] flex items-center justify-center">{value}</div>
        {sub ? <div className="text-xs text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  // A change from zero or from a loss has no meaningful percentage
  if (previous <= 0) return <span className="text-slate-400">—</span>;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="font-semibold text-slate-500">Same</span>;

  return (
    <span className={`font-semibold tabular-nums ${pct > 0 ? "text-emerald-700" : "text-red-700"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

type Comparison = { label: string; totals: Totals };

function PeriodCard({
  title,
  subtitle,
  current,
  comparisons,
  emptyText,
}: {
  title: string;
  subtitle: string;
  current: Totals;
  comparisons: Comparison[];
  emptyText: string;
}) {
  const metrics: Array<{ label: string; value: string; pick: (t: Totals) => number }> = [
    { label: "Orders", value: formatInt(current.orders), pick: (t) => t.orders },
    { label: "Revenue", value: formatGBP(current.revenue), pick: (t) => t.revenue },
    { label: "Gross profit", value: formatGBP(current.profit), pick: (t) => t.profit },
  ];

  return (
    <div className="pp-card p-5">
      <div className="text-base font-extrabold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>

      {current.orders === 0 ? (
        <div className="mt-4 text-sm text-slate-600">{emptyText}</div>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="py-1 text-left font-semibold"></th>
              <th className="py-1 text-right font-semibold"></th>
              {comparisons.map((c) => (
                <th key={c.label} className="py-1 pl-3 text-right font-semibold whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.label} className="border-t border-slate-100">
                <td className="py-2 text-slate-600">{m.label}</td>
                <td className="py-2 text-right font-extrabold tabular-nums text-slate-900">{m.value}</td>
                {comparisons.map((c) => (
                  <td key={c.label} className="py-2 pl-3 text-right whitespace-nowrap">
                    <Change current={m.pick(current)} previous={m.pick(c.totals)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {current.awaitingOrders > 0 ? (
        <div className="mt-2 text-xs font-semibold text-amber-700">
          {formatInt(current.awaitingOrders)} of these still awaiting payout ({formatGBP(current.awaitingValue)})
        </div>
      ) : null}
    </div>
  );
}

function TargetBar({
  label,
  actual,
  target,
  expected,
}: {
  label: string;
  actual: number;
  target: number;
  expected: number;
}) {
  const percent = Math.min(100, Math.max(0, (actual / target) * 100));
  const pacePercent = Math.min(100, Math.max(0, (expected / target) * 100));
  const diff = actual - expected;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-sm text-slate-700">
          <span className="font-extrabold text-slate-900">{formatGBPWhole(actual)}</span> of{" "}
          {formatGBPWhole(target)} ({Math.round((actual / target) * 100)}%)
        </div>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-teal-400" style={{ width: `${percent}%` }} />
        <div
          className="absolute -top-1 h-5 w-0.5 bg-slate-900"
          style={{ left: `${pacePercent}%` }}
          title={`Plan by today: ${formatGBPWhole(expected)}`}
        />
      </div>
      <div className={`mt-1 text-xs font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
        {formatGBPWhole(Math.abs(diff))} {diff >= 0 ? "ahead of" : "behind"} plan (
        {formatGBPWhole(expected)} by today)
      </div>
    </div>
  );
}

export default function DashboardSummary() {
  // Filters
  const [platform, setPlatform] = useState<string>("");
  const [platformCustom, setPlatformCustom] = useState<string>("");

  const [timeframe, setTimeframe] = useState<string>("mtd");
  const todayIso = isoDate(new Date());
  const [customFrom, setCustomFrom] = useState<string>(todayIso);
  const [customTo, setCustomTo] = useState<string>(todayIso);

  // Data states
  const [summary, setSummary] = useState<DashboardSummaryRow | null>(null);
  const [refundedCount, setRefundedCount] = useState<number>(0);

  // Orders in the selected timeframe (non-refunded) — queried directly to avoid RPC revenue bug
  const [periodOrders, setPeriodOrders] = useState<OrderRow[] | null>(null);

  // Every non-refunded order for the comparisons, targets and monthly table. Three calendar
  // years, because in January "last month, last year" is two calendar years back.
  const [allOrders, setAllOrders] = useState<OrderRow[] | null>(null);
  const [allOrdersError, setAllOrdersError] = useState<string>("");

  const [topProducts, setTopProducts] = useState<ProductRow[] | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const platformValueToSend = useMemo(() => {
    if (!platform) return null;
    if (platform === "custom") return platformCustom.trim() || null;
    return platform;
  }, [platform, platformCustom]);

  const { fromDate, toDateExclusive } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);

    if (timeframe === "mtd") {
      return { fromDate: isoDate(startOfMonth(today)), toDateExclusive: isoDate(tomorrow) };
    }

    if (timeframe === "last_month") {
      const firstThisMonth = startOfMonth(today);
      const firstLastMonth = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
      return { fromDate: isoDate(firstLastMonth), toDateExclusive: isoDate(firstThisMonth) };
    }

    const inclusiveTo = customTo || todayIso;
    return {
      fromDate: customFrom || todayIso,
      toDateExclusive: isoDate(addDays(new Date(inclusiveTo), 1)),
    };
  }, [timeframe, customFrom, customTo, todayIso]);

  // ✅ Next seasonal event (dated only)
  const nextEvent = useMemo(() => {
    const dated = seasonalEvents
      .filter((e) => !!e.dateISO)
      .map((e) => ({
        ...e,
        dateISO: e.dateISO!,
        prepISO: addDaysISO(e.dateISO!, -e.leadDays),
        daysToHoliday: daysUntil(todayIso, e.dateISO!),
        daysToPrep: daysUntil(todayIso, addDaysISO(e.dateISO!, -e.leadDays)),
      }))
      .filter((e) => e.daysToHoliday >= 0)
      .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

    return dated[0] ?? null;
  }, [todayIso]);

  async function loadTopSummary() {
    setLoading(true);
    setErrorMsg("");

    const args: any = {
      p_from_date: fromDate,
      p_to_date: toDateExclusive,
    };
    if (platformValueToSend) args.p_platform = platformValueToSend;

    const { data, error } = await supabase.rpc("dashboard_summary", args);

    if (error) {
      setErrorMsg(error.message);
      setSummary(null);
      setLoading(false);
      return;
    }

    setSummary((data?.[0] ?? null) as DashboardSummaryRow | null);
    setLoading(false);
  }

  async function loadPeriodOrders() {
    setPeriodOrders(null);

    try {
      const rows = await fetchAllPages<OrderRow>((rangeFrom, rangeTo) => {
        let q = supabase
          .from("orders")
          .select(ORDER_FIELDS)
          .gte("order_date", fromDate)
          .lt("order_date", toDateExclusive)
          .order("id", { ascending: true });

        if (platformValueToSend) q = q.eq("platform", platformValueToSend);

        // Exclude refunded
        q = q.or("is_refunded.is.null,is_refunded.eq.false");

        return q.range(rangeFrom, rangeTo);
      });

      setPeriodOrders(rows);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load orders");
    }
  }

  async function loadRefundedCount() {
    const args: any = {
      p_from: fromDate,
      p_to: toDateExclusive,
    };
    if (platformValueToSend) args.p_platform = platformValueToSend;

    const { data, error } = await supabase.rpc("dashboard_refunded_count", args);

    if (error) {
      setRefundedCount(0);
      return;
    }

    setRefundedCount(toNumber(data ?? 0));
  }

  async function loadTopProducts() {
    setTopProducts(null);

    const { data, error } = await supabase.rpc("list_products_summary", {
      p_from: fromDate,
      p_to: toDateExclusive,
      p_platform: platformValueToSend,
    });

    if (error) {
      setTopProducts([]);
      return;
    }

    const rows = (data ?? []) as ProductRow[];
    setTopProducts(
      [...rows].sort((a, b) => toNumber(b.units_sold) - toNumber(a.units_sold)).slice(0, 5)
    );
  }

  async function loadAllOrders() {
    setAllOrders(null);
    setAllOrdersError("");

    const year = new Date().getFullYear();

    try {
      const rows = await fetchAllPages<OrderRow>((rangeFrom, rangeTo) =>
        supabase
          .from("orders")
          .select(ORDER_FIELDS)
          .gte("order_date", `${year - 2}-01-01`)
          .lt("order_date", `${year + 1}-01-01`)
          .or("is_refunded.is.null,is_refunded.eq.false")
          .order("id", { ascending: true })
          .range(rangeFrom, rangeTo)
      );

      setAllOrders(rows);
    } catch (e: any) {
      setAllOrdersError(e?.message || "Failed to load orders");
    }
  }

  function loadPeriod() {
    loadTopSummary();
    loadRefundedCount();
    loadPeriodOrders();
    loadTopProducts();
  }

  useEffect(() => {
    loadAllOrders();
  }, []);

  useEffect(() => {
    loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDateExclusive, platformValueToSend]);

  const now = new Date();
  const yearA = now.getFullYear();
  const yearB = yearA - 1;

  const filteredOrders = useMemo(() => {
    if (!allOrders) return null;
    if (!platformValueToSend) return allOrders;
    return allOrders.filter((r) => r.platform === platformValueToSend);
  }, [allOrders, platformValueToSend]);

  // Orders sync in batches, so "up to today" would compare against days with nothing logged
  // yet. Everything like-for-like stops at the newest order instead. Across all platforms on
  // purpose — one quiet platform shouldn't shorten the window.
  const dataThrough = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return null;
    const latest = allOrders.reduce((max, r) => {
      const d = r.order_date.slice(0, 10);
      return d > max ? d : max;
    }, "");
    return latest > todayIso ? todayIso : latest;
  }, [allOrders, todayIso]);

  const awaitingAll = useMemo(() => totalsFor(filteredOrders ?? []), [filteredOrders]);

  const periodCards = useMemo(() => {
    if (!filteredOrders || !dataThrough) return null;

    const year = now.getFullYear();
    const month = now.getMonth();
    const inPeriod = (p: { from: string; to: string }) =>
      totalsFor(ordersBetween(filteredOrders, p.from, p.to));
    const short = (y: number, m: number) => {
      const d = new Date(y, m, 1);
      return `vs ${monthLabel(d.getMonth())} ${String(d.getFullYear()).slice(2)}`;
    };

    // Days of this month with orders logged. 0 when the newest order is from a previous month.
    const daysLogged =
      dataThrough >= monthPeriod(year, month).from ? Number(dataThrough.slice(8, 10)) : 0;

    const thisMonthName = monthLongLabel(month);
    const lastMonthDate = new Date(year, month - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth();

    return [
      {
        title: `${thisMonthName} so far`,
        subtitle:
          daysLogged > 0
            ? `1–${daysLogged} ${monthLabel(month)}, compared with the same days`
            : "Nothing logged for this month yet",
        current: daysLogged > 0 ? inPeriod(monthPeriod(year, month, daysLogged)) : totalsFor([]),
        comparisons: [
          { label: short(year, month - 1), totals: inPeriod(monthPeriod(year, month - 1, daysLogged)) },
          { label: short(year - 1, month), totals: inPeriod(monthPeriod(year - 1, month, daysLogged)) },
        ],
        emptyText: "No orders logged yet this month.",
      },
      {
        title: `${monthLongLabel(lastMonth)} (full month)`,
        subtitle: "Compared with the month before and last year",
        current: inPeriod(monthPeriod(lastMonthYear, lastMonth)),
        comparisons: [
          { label: short(lastMonthYear, lastMonth - 1), totals: inPeriod(monthPeriod(lastMonthYear, lastMonth - 1)) },
          { label: short(lastMonthYear - 1, lastMonth), totals: inPeriod(monthPeriod(lastMonthYear - 1, lastMonth)) },
        ],
        emptyText: "No orders in this month.",
      },
      {
        title: `${year} so far`,
        subtitle: `Up to ${formatUKDate(dataThrough)}, compared with the same dates`,
        current: inPeriod({ from: `${year}-01-01`, to: dataThrough }),
        comparisons: [
          {
            label: `vs ${year - 1}`,
            totals: inPeriod({ from: `${year - 1}-01-01`, to: `${year - 1}${dataThrough.slice(4)}` }),
          },
        ],
        emptyText: "No orders logged yet this year.",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, dataThrough]);

  // Targets are for the whole business, so these ignore the platform filter
  const target = TARGETS[yearA] ?? null;
  const yearToDate = useMemo(
    () => totalsFor(ordersBetween(allOrders ?? [], `${yearA}-01-01`, `${yearA}-12-31`)),
    [allOrders, yearA]
  );
  const expectedRevenueToday = target ? expectedRevenue(now, target.quarters) : 0;

  const monthly = useMemo(() => {
    if (!filteredOrders) return [];

    function byMonth(year: number) {
      return Array.from({ length: 12 }, (_, m) => {
        const p = monthPeriod(year, m);
        return totalsFor(ordersBetween(filteredOrders ?? [], p.from, p.to));
      });
    }

    const a = byMonth(yearA);
    const b = byMonth(yearB);

    return Array.from({ length: 12 }, (_, i) => ({ monthIndex: i, a: a[i], b: b[i] }));
  }, [filteredOrders, yearA, yearB]);

  const monthlyTotals = useMemo(() => {
    const sum = (key: "a" | "b") =>
      monthly.reduce(
        (acc, r) => ({
          orders: acc.orders + r[key].orders,
          revenue: acc.revenue + r[key].revenue,
          cost: acc.cost + r[key].cost,
          profit: acc.profit + r[key].profit,
        }),
        { orders: 0, revenue: 0, cost: 0, profit: 0 }
      );
    return { a: sum("a"), b: sum("b") };
  }, [monthly]);

  function exportMonthlyCSV() {
    const header = [
      "Month",
      `${yearA} Orders`,
      `${yearA} Revenue`,
      `${yearA} Cost`,
      `${yearA} Gross Profit`,
      `${yearB} Orders`,
      `${yearB} Revenue`,
      `${yearB} Cost`,
      `${yearB} Gross Profit`,
    ];

    const lines = monthly.map((r) => [
      monthLabel(r.monthIndex),
      String(r.a.orders),
      String(r.a.revenue),
      String(r.a.cost),
      String(r.a.profit),
      String(r.b.orders),
      String(r.b.revenue),
      String(r.b.cost),
      String(r.b.profit),
    ]);

    downloadCSV(`dashboard_monthly_${yearA}_${yearB}.csv`, [header, ...lines]);
  }

  // Cards come from the orders table directly, not the dashboard_summary RPC:
  //  - RPC revenue has a discount-deduction bug
  //  - RPC cogs disagrees with the per-order costs (£251 vs £1,037 for TY 25/26),
  //    so totals could not be reconciled against the Orders page
  // revenue = payout, cost = cogs + postage, profit = revenue - cost, all from the
  // same fields the Orders page shows, so the dashboard adds up to the order list.
  const period = useMemo(() => (periodOrders ? totalsFor(periodOrders) : null), [periodOrders]);

  const platformBreakdown = useMemo(() => {
    if (!periodOrders) return [];

    const groups = new Map<string, OrderRow[]>();
    for (const r of periodOrders) {
      const key = r.platform ?? "";
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }

    return Array.from(groups.entries())
      .map(([key, rows]) => ({ platform: key || null, totals: totalsFor(rows) }))
      .sort((a, b) => b.totals.revenue - a.totals.revenue);
  }, [periodOrders]);

  const periodName =
    timeframe === "mtd" ? "This month" : timeframe === "last_month" ? "Last month" : "Custom range";
  const periodTo =
    timeframe === "custom" ? customTo : isoDate(addDays(new Date(toDateExclusive), -1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pp-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">PacaPrints Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              {dataThrough ? (
                <>
                  Orders logged up to{" "}
                  <span className="font-semibold text-slate-800">{formatUKDate(dataThrough)}</span>
                </>
              ) : (
                "Loading orders…"
              )}
            </p>
            {awaitingAll.awaitingOrders > 0 ? (
              <p className="mt-1 text-sm font-semibold text-amber-700">
                {formatInt(awaitingAll.awaitingOrders)} orders awaiting payout (
                {formatGBP(awaitingAll.awaitingValue)}) — recent revenue and profit will read low until they settle
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              className="pp-btn pp-btn-secondary"
              onClick={() => {
                loadPeriod();
                loadAllOrders();
              }}
            >
              Refresh
            </button>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-900">Platform</label>
              <select className="pp-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">All</option>
                <option value="tiktok">TikTok</option>
                <option value="etsy">Etsy</option>
                <option value="ebay">eBay</option>
                <option value="shopify">Shopify</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {platform === "custom" && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-900">Custom</label>
                <input
                  type="text"
                  placeholder="Type platform value…"
                  className="pp-input"
                  value={platformCustom}
                  onChange={(e) => setPlatformCustom(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="pp-card p-4">
          <div className="text-sm font-semibold text-red-700">Failed to load dashboard summary: {errorMsg}</div>
        </div>
      ) : null}

      {/* How are we doing? */}
      <div>
        <div className="mb-3 text-sm font-extrabold text-slate-900">
          How are we doing?{platformValueToSend ? ` · ${platformLabel(platformValueToSend)}` : ""}
        </div>
        {allOrdersError ? (
          <div className="pp-card p-4">
            <div className="text-sm font-semibold text-red-700">Failed to load comparisons: {allOrdersError}</div>
          </div>
        ) : !periodCards ? (
          <div className="pp-card p-4 text-sm text-slate-600">Loading comparisons…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {periodCards.map((c) => (
              <PeriodCard key={c.title} {...c} />
            ))}
          </div>
        )}
      </div>

      {/* Targets */}
      {target && allOrders ? (
        <div className="pp-card p-5">
          <div className="text-sm font-extrabold text-slate-900">{yearA} targets · all platforms</div>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TargetBar
              label="Revenue"
              actual={yearToDate.revenue}
              target={target.revenue}
              expected={expectedRevenueToday}
            />
            <TargetBar
              label="Gross profit"
              actual={yearToDate.profit}
              target={target.profit}
              expected={(expectedRevenueToday / target.revenue) * target.profit}
            />
          </div>
          <div className="mt-3 text-xs text-slate-500">
            The black line is where the business plan expects you to be today, following its
            seasonal quarters.
          </div>
        </div>
      ) : null}

      {/* Selected period */}
      <div className="pp-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              {periodName} · {platformValueToSend ? platformLabel(platformValueToSend) : "All platforms"}
            </div>
            <div className="text-xs text-slate-500">
              {formatUKDate(fromDate)} → {formatUKDate(periodTo)}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-900">Time</label>
              <select className="pp-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                <option value="mtd">This month</option>
                <option value="last_month">Last month</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {timeframe === "custom" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-900">From</label>
                  <input
                    type="date"
                    className="pp-input"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-900">To</label>
                  <input
                    type="date"
                    className="pp-input"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Boxes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard
          title="Total Orders"
          value={period ? formatInt(period.orders) : "—"}
          sub={period && period.orders > 0 ? `${formatGBP(period.revenue / period.orders)} average` : undefined}
        />
        <StatCard title="Revenue" value={period ? formatGBP(period.revenue) : "—"} sub="Payout after fees" />
        <StatCard title="Cost" value={period ? formatGBP(period.cost) : "—"} sub="Products + postage" />
        <StatCard
          title="Gross Profit"
          value={period ? formatGBP(period.profit) : "—"}
          sub={
            period && period.revenue > 0
              ? `${Math.round((period.profit / period.revenue) * 100)}% margin`
              : undefined
          }
        />
        <StatCard title="Refunded" value={loading ? "—" : formatInt(refundedCount)} />
      </div>

      <p className="text-xs text-slate-500">
        Gross profit is revenue minus product costs and postage. Subscriptions and other overheads
        aren&rsquo;t included — those are on the Finance page.
      </p>

      {/* Platforms + top products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pp-card p-5">
          <div className="text-sm font-extrabold text-slate-900">By platform · {periodName.toLowerCase()}</div>
          {!periodOrders ? (
            <div className="mt-3 text-sm text-slate-600">Loading…</div>
          ) : platformBreakdown.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600">No orders in this period.</div>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="py-1 text-left font-semibold">Platform</th>
                  <th className="py-1 pl-3 text-right font-semibold">Orders</th>
                  <th className="py-1 pl-3 text-right font-semibold">Revenue</th>
                  <th className="py-1 pl-3 text-right font-semibold">Profit</th>
                  <th className="py-1 pl-3 text-right font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {platformBreakdown.map((p) => (
                  <tr key={p.platform ?? "unknown"} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-slate-900">{platformLabel(p.platform)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatInt(p.totals.orders)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatGBP(p.totals.revenue)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatGBP(p.totals.profit)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">
                      {p.totals.revenue > 0
                        ? `${Math.round((p.totals.profit / p.totals.revenue) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pp-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold text-slate-900">Top 5 products · {periodName.toLowerCase()}</div>
            <a href="/products" className="text-xs font-semibold underline text-slate-500 shrink-0">
              View all →
            </a>
          </div>
          {!topProducts ? (
            <div className="mt-3 text-sm text-slate-600">Loading…</div>
          ) : topProducts.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600">No sales in this period.</div>
          ) : (
            <ol className="mt-3 space-y-2">
              {topProducts.map((p, i) => (
                <li key={`${p.product_name}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-800">
                    {i + 1}. {p.product_name}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    <span className="font-extrabold text-slate-900">{formatInt(toNumber(p.units_sold))}</span> sold
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Stock + seasonal */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="pp-card p-5 text-center">
          <div className="text-sm font-extrabold text-slate-900">Total Stock Value</div>
          <div className="mt-4 text-3xl font-extrabold text-slate-900">
            {loading || !summary ? "—" : formatGBP(toNumber(summary.stock_value))}
          </div>
          <div className="mt-2 text-xs text-slate-600">Always total (not affected by timeframe)</div>
        </div>

        {/* ✅ Next seasonal event */}
        <div className="pp-card p-5">
          <div className="text-sm font-extrabold text-slate-900">Next Seasonal Event</div>

          {!nextEvent ? (
            <div className="mt-3 text-sm text-slate-600">No upcoming dated events found.</div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-base font-extrabold text-slate-900">{nextEvent.name}</div>

              <div className="text-sm text-slate-700">
                Holiday: <span className="font-semibold">{formatUKDate(nextEvent.dateISO)}</span>{" "}
                <span className="text-slate-500">({nextEvent.daysToHoliday} days)</span>
              </div>

              <div className="text-sm text-slate-700">
                Be ready by:{" "}
                <span className={`font-semibold ${nextEvent.daysToPrep < 0 ? "text-red-700" : "text-slate-900"}`}>
                  {formatUKDate(nextEvent.prepISO)}
                </span>{" "}
                <span className="text-slate-500">({nextEvent.daysToPrep} days)</span>
              </div>

              {nextEvent.ideas ? (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Ideas:</span> {nextEvent.ideas}
                </div>
              ) : null}

              <div className="pt-1">
                <a href="/seasonal" className="text-sm font-semibold underline text-slate-700">
                  Open Seasonal Planner →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly table */}
      <div className="pp-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Monthly totals ({yearA} vs {yearB})</div>
            <div className="text-xs text-slate-500 md:hidden">Swipe the table sideways to see {yearB} →</div>
          </div>
          <button
            type="button"
            className="pp-btn pp-btn-secondary"
            disabled={!allOrders}
            onClick={exportMonthlyCSV}
          >
            Export monthly CSV
          </button>
        </div>

        {allOrdersError ? (
          <div className="pp-card p-4">
            <div className="text-sm font-semibold text-red-700">Failed to load monthly table: {allOrdersError}</div>
          </div>
        ) : !allOrders ? (
          <div className="text-sm text-slate-600">Loading monthly table…</div>
        ) : (
          <div className="pp-table">
            {/* The scroller sits inside .pp-table because that class clips its overflow */}
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full min-w-[820px] whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="pp-sticky-col">Month</th>
                    <th>{yearA} Orders</th>
                    <th>{yearA} Revenue</th>
                    <th>{yearA} Cost</th>
                    <th>{yearA} Gross Profit</th>
                    <th>{yearB} Orders</th>
                    <th>{yearB} Revenue</th>
                    <th>{yearB} Cost</th>
                    <th>{yearB} Gross Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => {
                    const isCurrent = r.monthIndex === now.getMonth();
                    const isFuture = r.monthIndex > now.getMonth();
                    const thisYear = (text: string) => (isFuture ? "—" : text);

                    return (
                      <tr key={r.monthIndex} className={isCurrent ? "pp-row-current" : undefined}>
                        <td className={`pp-sticky-col font-semibold ${isFuture ? "text-slate-400" : "text-slate-900"}`}>
                          {monthLabel(r.monthIndex)}
                        </td>

                        <td className={isFuture ? "text-slate-400" : undefined}>{thisYear(formatInt(r.a.orders))}</td>
                        <td className={isFuture ? "text-slate-400" : undefined}>{thisYear(formatGBP(r.a.revenue))}</td>
                        <td className={isFuture ? "text-slate-400" : undefined}>{thisYear(formatGBP(r.a.cost))}</td>
                        <td className={isFuture ? "text-slate-400" : undefined}>{thisYear(formatGBP(r.a.profit))}</td>

                        <td>{formatInt(r.b.orders)}</td>
                        <td>{formatGBP(r.b.revenue)}</td>
                        <td>{formatGBP(r.b.cost)}</td>
                        <td>{formatGBP(r.b.profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pp-sticky-col">Total</td>
                    <td>{formatInt(monthlyTotals.a.orders)}</td>
                    <td>{formatGBP(monthlyTotals.a.revenue)}</td>
                    <td>{formatGBP(monthlyTotals.a.cost)}</td>
                    <td>{formatGBP(monthlyTotals.a.profit)}</td>
                    <td>{formatInt(monthlyTotals.b.orders)}</td>
                    <td>{formatGBP(monthlyTotals.b.revenue)}</td>
                    <td>{formatGBP(monthlyTotals.b.cost)}</td>
                    <td>{formatGBP(monthlyTotals.b.profit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
