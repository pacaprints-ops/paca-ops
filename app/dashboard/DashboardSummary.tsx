// pacaprints-ops/app/dashboard/DashboardSummary.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
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
  total_revenue: number | string | null;
  total_cost: number | string | null;
  gross_profit: number | string | null;
  is_refunded?: boolean | null;
};

type MaterialRow = {
  id: string;
  name: string;
  reorder_level: number | string | null;
  track_stock: boolean | null;
};

type BatchRow = {
  material_id: string;
  remaining_quantity: number | string | null;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
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
function formatInt(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value ?? 0);
}
function monthLabel(i: number) {
  return new Date(2000, i, 1).toLocaleString("en-GB", { month: "short" });
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
  return d.toISOString().slice(0, 10);
}

function daysUntil(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
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

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="pp-card-strong">
      <div className="pp-stat">
        <div className="pp-stat-label">{title}</div>
        <div className="pp-stat-value min-h-[44px] flex items-center justify-center">{value}</div>
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
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Shipping sum for timeframe (non-refunded)
  const [shippingSum, setShippingSum] = useState<number>(0);

  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(true);
  const [monthlyError, setMonthlyError] = useState<string>("");
  const [monthly, setMonthly] = useState<
    Array<{
      monthIndex: number;
      a: { orders: number; revenue: number; cogs: number; profit: number };
      b: { orders: number; revenue: number; cogs: number; profit: number };
    }>
  >([]);

  type LowStockItem = { name: string; qty: number; reorderLevel: number; status: "out" | "low" };
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

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

  async function loadShippingSum() {
    let q = supabase
      .from("orders")
      .select("shipping_cost,is_refunded")
      .gte("order_date", fromDate)
      .lt("order_date", toDateExclusive);

    if (platformValueToSend) q = q.eq("platform", platformValueToSend);

    // Exclude refunded
    q = q.or("is_refunded.is.null,is_refunded.eq.false");

    const { data, error } = await q;
    if (error) {
      setShippingSum(0);
      return;
    }

    const sum = (data ?? []).reduce((acc: number, r: any) => acc + toNumber(r?.shipping_cost), 0);
    setShippingSum(sum);
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

  async function loadLowStockAlert() {
    const { data: mats, error: matsErr } = await supabase
      .from("materials")
      .select("id,name,reorder_level,track_stock");

    if (matsErr) {
      setLowStockCount(0);
      return;
    }

    const { data: b, error: bErr } = await supabase
      .from("batches")
      .select("material_id,remaining_quantity");

    if (bErr) {
      setLowStockCount(0);
      return;
    }

    const materials = (mats ?? []) as MaterialRow[];
    const batches = (b ?? []) as BatchRow[];

    const onHandByMaterial = new Map<string, number>();
    for (const row of batches) {
      const mid = row.material_id;
      const qty = toNumber(row.remaining_quantity);
      onHandByMaterial.set(mid, (onHandByMaterial.get(mid) ?? 0) + qty);
    }

    const items: LowStockItem[] = [];
    for (const m of materials) {
      if (!m.track_stock) continue;
      const rl = m.reorder_level === null ? null : toNumber(m.reorder_level);
      if (rl === null || !Number.isFinite(rl)) continue;

      const onHand = onHandByMaterial.get(m.id) ?? 0;
      if (onHand < rl) {
        items.push({ name: m.name, qty: onHand, reorderLevel: rl, status: onHand === 0 ? "out" : "low" });
      }
    }

    items.sort((a, b) => a.qty - b.qty);
    setLowStockItems(items);
    setLowStockCount(items.length);
  }

  async function loadMonthlyTable() {
    setMonthlyLoading(true);
    setMonthlyError("");

    const now = new Date();
    const yearA = now.getFullYear();
    const yearB = yearA - 1;
    const platformFilter = platformValueToSend;

    async function fetchYear(y: number) {
      const from = `${y}-01-01`;
      const to = `${y + 1}-01-01`;

      let q = supabase
        .from("orders")
        .select("order_date,total_revenue,total_cost,gross_profit,is_refunded")
        .gte("order_date", from)
        .lt("order_date", to);

      if (platformFilter) q = q.eq("platform", platformFilter);

      // Exclude refunded
      q = q.or("is_refunded.is.null,is_refunded.eq.false");

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      return (data ?? []) as OrderRow[];
    }

    try {
      const [aRows, bRows] = await Promise.all([fetchYear(yearA), fetchYear(yearB)]);

      function aggregate(rows: OrderRow[]) {
        const byMonth = Array.from({ length: 12 }, () => ({
          orders: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        }));

        for (const r of rows) {
          const d = new Date(r.order_date);
          const m = d.getMonth();
          if (m < 0 || m > 11) continue;

          byMonth[m].orders += 1;
          byMonth[m].revenue += toNumber(r.total_revenue);
          byMonth[m].cogs += toNumber(r.total_cost);
          byMonth[m].profit += toNumber(r.gross_profit);
        }
        return byMonth;
      }

      const aAgg = aggregate(aRows);
      const bAgg = aggregate(bRows);

      setMonthly(
        Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          a: aAgg[i],
          b: bAgg[i],
        }))
      );

      setMonthlyLoading(false);
    } catch (e: any) {
      setMonthlyError(e?.message || "Failed to load monthly table");
      setMonthlyLoading(false);
    }
  }

  function exportMonthlyCSV() {
    const now = new Date();
    const yearA = now.getFullYear();
    const yearB = yearA - 1;

    const header = [
      "Month",
      `${yearA} Orders`,
      `${yearA} Revenue`,
      `${yearA} Cost`,
      `${yearA} Profit`,
      `${yearB} Orders`,
      `${yearB} Revenue`,
      `${yearB} Cost`,
      `${yearB} Profit`,
    ];

    const lines = monthly.map((r) => [
      monthLabel(r.monthIndex),
      String(r.a.orders),
      String(r.a.revenue),
      String(r.a.cogs),
      String(r.a.profit),
      String(r.b.orders),
      String(r.b.revenue),
      String(r.b.cogs),
      String(r.b.profit),
    ]);

    downloadCSV(`dashboard_monthly_${yearA}_${yearB}.csv`, [header, ...lines]);
  }

  useEffect(() => {
    loadTopSummary();
    loadRefundedCount();
    loadLowStockAlert();
    loadMonthlyTable();
    loadShippingSum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDateExclusive, platformValueToSend]);

  const now = new Date();
  const yearA = now.getFullYear();
  const yearB = yearA - 1;

  // Cards: payout revenue, ALL-IN cost (cogs + shipping), profit = revenue - cost
  const revenuePayout = loading || !summary ? null : toNumber(summary.revenue);
  const cogsOnly = loading || !summary ? null : toNumber(summary.cogs);
  const costAllIn = revenuePayout === null || cogsOnly === null ? null : cogsOnly + toNumber(shippingSum);
  const profitAllIn = revenuePayout === null || costAllIn === null ? null : revenuePayout - costAllIn;

  const lowCardClasses =
    lowStockCount > 0
      ? "pp-card p-5 text-center bg-red-50 border-red-200"
      : "pp-card p-5 text-center";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pp-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">PacaPrints Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Showing:{" "}
              <span className="font-semibold text-slate-800">
                {timeframe === "mtd" ? "MTD" : timeframe === "last_month" ? "Last month" : "Custom range"}
              </span>
              {" · "}
              <span className="font-semibold text-slate-800">
                {platformValueToSend ? platformValueToSend : "All platforms"}
              </span>
              {" · "}
              <span className="font-semibold text-slate-800">
                {fromDate} →{" "}
                {timeframe === "custom" ? customTo : isoDate(addDays(new Date(toDateExclusive), -1))}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
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

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-900">Time</label>
              <select className="pp-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                <option value="mtd">MTD</option>
                <option value="last_month">Last Month</option>
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

      {errorMsg ? (
        <div className="pp-card p-4">
          <div className="text-sm font-semibold text-red-700">Failed to load dashboard summary: {errorMsg}</div>
        </div>
      ) : null}

      {/* Top Boxes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Total Orders" value={loading || !summary ? "—" : formatInt(toNumber(summary.order_count))} />
        <StatCard title="Revenue" value={revenuePayout === null ? "—" : formatGBP(revenuePayout)} />
        <StatCard title="Cost" value={costAllIn === null ? "—" : formatGBP(costAllIn)} />
        <StatCard title="Profit" value={profitAllIn === null ? "—" : formatGBP(profitAllIn)} />
        <StatCard title="Refunded" value={loading ? "—" : formatInt(refundedCount)} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Low stock — shows each material with its quantity */}
        <div className={lowCardClasses}>
          <div className="text-sm font-extrabold text-slate-900">Low Stock Alert</div>
          {lowStockItems.length === 0 ? (
            <div className="mt-4 text-3xl font-extrabold text-slate-900">—</div>
          ) : (
            <ul className="mt-3 space-y-1 text-left">
              {lowStockItems.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800 truncate">{item.name}</span>
                  <span className={`font-extrabold tabular-nums shrink-0 ${item.status === "out" ? "text-red-700" : "text-amber-600"}`}>
                    {formatInt(item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 text-xs text-slate-500">
            <span className="text-red-700 font-semibold">Red</span> = out &nbsp;·&nbsp; <span className="text-amber-600 font-semibold">Amber</span> = low
          </div>
        </div>

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
          <div className="text-sm font-extrabold text-slate-900">Monthly totals ({yearA} vs {yearB})</div>
          <button
            type="button"
            className="pp-btn pp-btn-secondary"
            disabled={monthlyLoading || !!monthlyError || monthly.length === 0}
            onClick={exportMonthlyCSV}
          >
            Export monthly CSV
          </button>
        </div>

        {monthlyError ? (
          <div className="pp-card p-4">
            <div className="text-sm font-semibold text-red-700">Failed to load monthly table: {monthlyError}</div>
          </div>
        ) : monthlyLoading ? (
          <div className="text-sm text-slate-600">Loading monthly table…</div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="pp-table">
              <table className="min-w-[980px]">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>{yearA} Orders</th>
                    <th>{yearA} Revenue</th>
                    <th>{yearA} Cost</th>
                    <th>{yearA} Profit</th>
                    <th>{yearB} Orders</th>
                    <th>{yearB} Revenue</th>
                    <th>{yearB} Cost</th>
                    <th>{yearB} Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => (
                    <tr key={r.monthIndex}>
                      <td className="font-semibold text-slate-900">{monthLabel(r.monthIndex)}</td>

                      <td>{formatInt(r.a.orders)}</td>
                      <td>{formatGBP(r.a.revenue)}</td>
                      <td>{formatGBP(r.a.cogs)}</td>
                      <td>{formatGBP(r.a.profit)}</td>

                      <td>{formatInt(r.b.orders)}</td>
                      <td>{formatGBP(r.b.revenue)}</td>
                      <td>{formatGBP(r.b.cogs)}</td>
                      <td>{formatGBP(r.b.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}