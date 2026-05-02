
import Link from "next/link";
import ExportOrdersButton from "./ExportOrdersButton";
import RevenueQuickEdit from "./RevenueQuickEdit";
import MoneyQuickEdit from "./MoneyQuickEdit";
import PlatformQuickEdit from "./PlatformQuickEdit";
import OrderFlagsQuickToggle from "./OrderFlagsQuickToggle";
import { supabase } from "../lib/supabaseClient";

type OrderRow = {
  id: string;
  order_no: number;
  created_at: string;
  order_date: string | null;
  platform: string | null;
  platform_order_ref: string | null;
  customer_name: string | null;

  revenue: any; // payout (net)
  shipping_cost: any;
  discounts: any;
  total_cost: any;
  gross_profit: any;

  items_summary: string;
  is_settled: boolean;
  is_refunded: boolean;
  refund_notes: string | null;

  gross_revenue?: any;
  platform_fees?: any;
  cogs_override?: any;

  needs_attention?: boolean;
  attention_note?: string | null;
};

function formatGBP(v: any) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDateUK(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB").format(d);
}

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

function rangeFromTimeframe(timeframe: string, customFrom: string, customTo: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);

  if (timeframe === "mtd") {
    return { from: isoDate(startOfMonth(today)), toExclusive: isoDate(tomorrow) };
  }

  if (timeframe === "last_month") {
    const firstThisMonth = startOfMonth(today);
    const firstLastMonth = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
    return { from: isoDate(firstLastMonth), toExclusive: isoDate(firstThisMonth) };
  }

  const safeFrom = customFrom || isoDate(startOfMonth(today));
  const safeTo = customTo || isoDate(today);
  return { from: safeFrom, toExclusive: isoDate(addDays(new Date(safeTo), 1)) };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    platform?: string;
    timeframe?: string;
    from?: string;
    to?: string;
    platform_custom?: string;
    q?: string;
  }>;
}) {
  const sp = (await searchParams) ?? {};
  const platform = sp.platform ?? "";
  const platformCustom = sp.platform_custom ?? "";
  const timeframe = sp.timeframe ?? "mtd";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const q = sp.q ?? "";

  const todayIso = isoDate(new Date());
  const customFrom = from || todayIso;
  const customTo = to || todayIso;

  const { from: p_from, toExclusive: p_to } = rangeFromTimeframe(timeframe, customFrom, customTo);

  let p_platform: string | null = null;
  if (platform === "custom") p_platform = platformCustom.trim() || null;
  else if (platform) p_platform = platform;

  const { data, error } = await supabase.rpc("list_orders", {
    p_from,
    p_to,
    p_platform,
    p_search: q.trim() || null,
  });

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="mt-3 rounded-lg border bg-red-50 p-3 text-sm text-red-700">
          Error loading orders: {error.message}
        </p>
      </main>
    );
  }

  const rows = (data ?? []) as OrderRow[];

  function setParamHref(key: string, value: string) {
    const qs = new URLSearchParams();
    if (platform) qs.set("platform", platform);
    if (platformCustom) qs.set("platform_custom", platformCustom);
    if (timeframe) qs.set("timeframe", timeframe);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (q) qs.set("q", q);

    const n = new URLSearchParams(qs.toString());
    if (value) n.set(key, value);
    else n.delete(key);
    return `/orders?${n.toString()}`;
  }

  return (
    <main className="p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Showing {rows.length} orders · {formatDateUK(p_from)} →{" "}
            {formatDateUK(isoDate(addDays(new Date(p_to), -1)))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportOrdersButton rows={rows} from={p_from} to={isoDate(addDays(new Date(p_to), -1))} />
          <Link
            href="/orders/create"
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm"
          >
            + Add order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
        {/* Search */}
        <form action="/orders" method="get" className="flex flex-wrap items-center gap-2">
          {platform ? <input type="hidden" name="platform" value={platform} /> : null}
          {platformCustom ? <input type="hidden" name="platform_custom" value={platformCustom} /> : null}
          {timeframe ? <input type="hidden" name="timeframe" value={timeframe} /> : null}
          {from ? <input type="hidden" name="from" value={from} /> : null}
          {to ? <input type="hidden" name="to" value={to} /> : null}

          <span className="text-sm font-semibold text-gray-900">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Platform ref, product, customer…"
            className="rounded-lg border bg-white px-3 py-2 text-sm w-[240px] max-w-full"
          />
          <button className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Go</button>

          {q ? (
            <Link
              href={setParamHref("q", "")}
              className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {/* Platform */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Platform</span>
          <div className="flex flex-wrap gap-2">
            {[
              ["", "All"],
              ["tiktok", "TikTok"],
              ["etsy", "Etsy"],
              ["ebay", "eBay"],
              ["shopify", "Shopify"],
              ["custom", "Custom"],
            ].map(([val, label]) => {
              const active = platform === val;
              return (
                <Link
                  key={val}
                  href={setParamHref("platform", val)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    active ? "bg-gray-900 text-white" : "border bg-white text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Time</span>
          <div className="flex flex-wrap gap-2">
            {[
              ["mtd", "MTD"],
              ["last_month", "Last month"],
              ["custom", "Custom range"],
            ].map(([val, label]) => {
              const active = timeframe === val;
              return (
                <Link
                  key={val}
                  href={setParamHref("timeframe", val)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    active ? "bg-gray-900 text-white" : "border bg-white text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* UK Tax year quick-select */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Tax year</span>
          <div className="flex flex-wrap gap-2">
            {[2023, 2024, 2025, 2026].map((y) => {
              const tyFrom = `${y}-04-06`;
              const tyTo = `${y + 1}-04-05`;
              const active = timeframe === "custom" && customFrom === tyFrom && customTo === tyTo;
              return (
                <Link
                  key={y}
                  href={`/orders?timeframe=custom&from=${tyFrom}&to=${tyTo}${platform ? `&platform=${platform}` : ""}${platformCustom ? `&platform_custom=${platformCustom}` : ""}`}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    active ? "bg-gray-900 text-white" : "border bg-white text-gray-900"
                  }`}
                >
                  {y}/{String(y + 1).slice(2)}
                </Link>
              );
            })}
          </div>
        </div>

        {timeframe === "custom" ? (
          <form action="/orders" method="get" className="flex flex-wrap items-center gap-2">
            {platform ? <input type="hidden" name="platform" value={platform} /> : null}
            {platformCustom ? <input type="hidden" name="platform_custom" value={platformCustom} /> : null}
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <input type="hidden" name="timeframe" value="custom" />

            <span className="text-sm font-semibold text-gray-900">From</span>
            <input type="date" name="from" defaultValue={customFrom} className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <span className="text-sm font-semibold text-gray-900">To</span>
            <input type="date" name="to" defaultValue={customTo} className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <button className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Apply</button>
          </form>
        ) : null}

        <Link href="/orders" className="ml-auto rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-900">
          Reset
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Order date</th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden sm:table-cell">
                Platform
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Platform ref</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden md:table-cell">Products</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden md:table-cell">Customer</th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Gross</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden sm:table-cell">Fees</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Payout</th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden sm:table-cell">Shipping</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden sm:table-cell">COGS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap hidden sm:table-cell">Profit</th>

              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Edit</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((o) => {
              const rowClass = o.is_refunded
                ? "bg-gray-50 text-gray-500"
                : o.needs_attention
                ? "bg-amber-50 border-l-4 border-l-amber-400"
                : "";

              const gross = Number(o.gross_revenue ?? 0);
              const fees = Number(o.platform_fees ?? 0);

              const payout = Number(o.revenue ?? 0);
              const shipping = Number(o.shipping_cost ?? 0);

              const cogs = Number(o.cogs_override ?? o.total_cost ?? 0);

              // keep definition consistent with your edit page:
              const profit = payout - shipping - cogs;

              return (
                <tr key={o.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${rowClass}`}>
                  <td className="px-4 py-3 whitespace-nowrap">{o.order_no}</td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/orders/${o.id}`} className="underline decoration-transparent hover:decoration-gray-400">
                      {formatDateUK(o.order_date)}
                    </Link>
                    {o.is_refunded ? <div className="mt-1 text-xs font-semibold text-red-700">Refunded</div> : null}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    <PlatformQuickEdit orderId={o.id} currentPlatform={o.platform ?? null} />
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">{o.platform_order_ref ?? "—"}</td>

                  <td className="px-4 py-3 hidden md:table-cell">{o.items_summary ? o.items_summary : "—"}</td>

                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{o.customer_name ?? "—"}</td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <MoneyQuickEdit
                      orderId={o.id}
                      currentValue={gross}
                      title="Update gross"
                      label="Customer paid (gross)"
                      rpcName="update_order_gross"
                      rpcParam="p_gross_revenue"
                    />
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap hidden sm:table-cell${!o.is_refunded && fees === 0 ? " bg-red-50" : ""}`}>
                    <MoneyQuickEdit
                      orderId={o.id}
                      currentValue={fees}
                      title="Update fees"
                      label="Platform fees"
                      rpcName="update_order_fees"
                      rpcParam="p_platform_fees"
                    />
                    {!o.is_refunded && fees === 0 ? <div className="text-[10px] text-red-600 font-semibold">Not entered</div> : null}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <RevenueQuickEdit orderId={o.id} currentRevenue={o.revenue} />
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap hidden sm:table-cell${!o.is_refunded && shipping === 0 ? " bg-red-50" : ""}`}>
                    <MoneyQuickEdit
                      orderId={o.id}
                      currentValue={shipping}
                      title="Update shipping"
                      label="Shipping cost"
                      rpcName="update_order_shipping"
                      rpcParam="p_shipping_cost"
                    />
                    {!o.is_refunded && shipping === 0 ? <div className="text-[10px] text-red-600 font-semibold">Not entered</div> : null}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">{formatGBP(cogs)}</td>

                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">{formatGBP(profit)}</td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <OrderFlagsQuickToggle
                      orderId={o.id}
                      isSettled={!!o.is_settled}
                      isRefunded={!!o.is_refunded}
                      refundNotes={o.refund_notes}
                      needsAttention={!!o.needs_attention}
                      attentionNote={o.attention_note ?? null}
                    />
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/orders/${o.id}`} className="text-sm text-gray-600 underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-6 text-gray-600">
                  No orders for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Refunded orders are greyed out. Settled shows green. 🚩 is only available when not settled.
      </p>
    </main>
  );
}