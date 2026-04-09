"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type OrderHeader = {
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

  total_cost: any; // FIFO COGS
  total_revenue: any;
  gross_profit: any;

  // NEW
  gross_revenue: any | null; // customer paid (gross)
  platform_fees: any; // fees
  cogs_override: any | null; // historical override

  is_settled: boolean;
  is_refunded: boolean;
  refund_notes: string | null;
};

type OrderLine = {
  order_product_id: string;
  product_name: string;
  recipe_name: string;
  quantity: number;
  line_cost: any;
};

function fmtGBP(n: any) {
  const x = Number(n ?? 0);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number.isFinite(x) ? x : 0
  );
}

function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function OrderEditPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingFlags, setSavingFlags] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [order, setOrder] = useState<OrderHeader | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);

  // editable header fields
  const [orderDate, setOrderDate] = useState<string>("");
  const [platform, setPlatform] = useState<string>("tiktok");
  const [platformRef, setPlatformRef] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");

  // money fields
  const [grossRevenue, setGrossRevenue] = useState<string>("0"); // gross_revenue
  const [platformFees, setPlatformFees] = useState<string>("0"); // platform_fees
  const [revenue, setRevenue] = useState<string>("0"); // payout
  const [shippingCost, setShippingCost] = useState<string>("0");
  const [discounts, setDiscounts] = useState<string>("0");
  const [cogsOverride, setCogsOverride] = useState<string>(""); // blank = null

  // refund notes
  const [refundNotes, setRefundNotes] = useState<string>("");

  async function load(id: string) {
    setLoading(true);
    setErrorMsg("");

    const { data: h, error: hErr } = await supabase.rpc("get_order_header", { p_order_id: id });
    if (hErr) {
      setErrorMsg(hErr.message);
      setLoading(false);
      return;
    }

    const header = Array.isArray(h) ? (h[0] as OrderHeader) : (h as OrderHeader);
    setOrder(header);

    // hydrate editable fields
    setOrderDate(header.order_date ?? "");
    setPlatform(header.platform ?? "tiktok");
    setPlatformRef(header.platform_order_ref ?? "");
    setCustomerName(header.customer_name ?? "");

    setGrossRevenue(String(header.gross_revenue ?? 0));
    setPlatformFees(String(header.platform_fees ?? 0));

    setRevenue(String(header.revenue ?? 0));
    setShippingCost(String(header.shipping_cost ?? 0));
    setDiscounts(String(header.discounts ?? 0));

    // blank means "null" (no override)
    setCogsOverride(header.cogs_override === null || header.cogs_override === undefined ? "" : String(header.cogs_override));

    setRefundNotes(header.refund_notes ?? "");

    const { data: l, error: lErr } = await supabase.rpc("list_order_products", { p_order_id: id });
    if (lErr) {
      setErrorMsg(lErr.message);
      setLoading(false);
      return;
    }

    setLines((l ?? []) as OrderLine[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!orderId) return;
    load(orderId).catch((e) => {
      setErrorMsg(e?.message ?? "Failed to load order");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function saveFlags(nextSettled: boolean, nextRefunded: boolean, nextNotes: string) {
    if (!orderId || !order) return;

    setSavingFlags(true);
    setErrorMsg("");

    // optimistic
    setOrder({ ...order, is_settled: nextSettled, is_refunded: nextRefunded, refund_notes: nextNotes });
    setRefundNotes(nextNotes);

    const { error } = await supabase.rpc("set_order_flags", {
      p_order_id: orderId,
      p_is_settled: nextSettled,
      p_is_refunded: nextRefunded,
      p_refund_notes: nextRefunded ? (nextNotes?.trim() || null) : null,
    });

    setSavingFlags(false);

    if (error) {
      await load(orderId);
      setErrorMsg(error.message);
    }
  }

  const computed = useMemo(() => {
    const gross = toNum(grossRevenue);
    const fees = toNum(platformFees);
    const payout = toNum(revenue);
    const ship = toNum(shippingCost);

    // COGS used: override if provided, else FIFO total_cost (from loaded order)
    const overrideProvided = cogsOverride.trim() !== "";
    const cogsUsed = overrideProvided ? toNum(cogsOverride) : Number(order?.total_cost ?? 0);

    // MATCHES TABLE/EDIT behaviour right now
    const profit = payout - ship - cogsUsed;

    // helpful extra numbers
    const expectedPayout = gross - fees;

    return { gross, fees, payout, ship, cogsUsed, profit, expectedPayout, overrideProvided };
  }, [grossRevenue, platformFees, revenue, shippingCost, cogsOverride, order?.total_cost]);

  async function deleteOrder() {
    if (!orderId) return;
    setDeleting(true);
    setErrorMsg("");
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    setDeleting(false);
    if (error) {
      setErrorMsg(error.message);
      setConfirmDelete(false);
      return;
    }
    router.push("/orders");
  }

  async function saveHeader() {
    if (!orderId || !order) return;

    setSavingHeader(true);
    setErrorMsg("");

    if (!orderDate) {
      setSavingHeader(false);
      setErrorMsg("Order date is required.");
      return;
    }

    const cogsOverrideValue =
      cogsOverride.trim() === "" ? null : toNum(cogsOverride);

    const { error } = await supabase.rpc("update_order_header", {
      p_order_id: orderId,
      p_order_date: orderDate,
      p_platform: platform || null,
      p_platform_order_ref: platformRef.trim() || null,
      p_customer_name: customerName.trim() || null,
      p_revenue: toNum(revenue),
      p_shipping_cost: toNum(shippingCost),
      p_discounts: toNum(discounts),

      p_gross_revenue: toNum(grossRevenue),
      p_platform_fees: toNum(platformFees),
      p_cogs_override: cogsOverrideValue,
    });

    setSavingHeader(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await load(orderId);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit order</h1>
          <p className="text-sm text-gray-600 mt-1">Order ID: {orderId ?? "—"}</p>
        </div>

        <Link href="/orders" className="text-sm text-gray-600 underline">
          Back to orders
        </Link>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : !order ? (
        <div className="text-sm text-gray-600">Order not found.</div>
      ) : (
        <div className="space-y-4">
          {/* Editable header */}
          <section className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Order #{order.order_no}</div>
                <div className="text-xs text-gray-500">Created: {order.created_at}</div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!order.is_settled}
                    disabled={savingFlags}
                    onChange={(e) => saveFlags(e.target.checked, !!order.is_refunded, refundNotes)}
                  />
                  Settled
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!order.is_refunded}
                    disabled={savingFlags}
                    onChange={(e) => {
                      const nextRefunded = e.target.checked;
                      const nextNotes = nextRefunded ? refundNotes : "";
                      saveFlags(!!order.is_settled, nextRefunded, nextNotes);
                    }}
                  />
                  Refunded
                </label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Order date</div>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Platform</div>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="shopify">Shopify</option>
                  <option value="etsy">Etsy</option>
                  <option value="ebay">eBay</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Platform ref</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={platformRef}
                  onChange={(e) => setPlatformRef(e.target.value)}
                  placeholder="Order ID / reference"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Customer name</div>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Gross (customer paid)</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={grossRevenue}
                  onChange={(e) => setGrossRevenue(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Platform fees</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={platformFees}
                  onChange={(e) => setPlatformFees(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Payout (net received)</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">Shipping cost</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </label>

              <label className="text-sm">
                <div className="text-xs font-medium text-gray-700 mb-1">COGS override (historical)</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={cogsOverride}
                  onChange={(e) => setCogsOverride(e.target.value)}
                  placeholder="Leave blank to use FIFO COGS"
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Blank = use FIFO ({fmtGBP(order.total_cost)}). Fill for historical orders to show true COGS.
                </div>
              </label>

              <label className="text-sm sm:col-span-2">
                <div className="text-xs font-medium text-gray-700 mb-1">Discounts</div>
                <input
                  inputMode="decimal"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={discounts}
                  onChange={(e) => setDiscounts(e.target.value)}
                />
              </label>
            </div>

            {/* Refund notes appears only when refunded */}
            {order.is_refunded ? (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund notes (optional)
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Why was this refunded?"
                />
                <button
                  type="button"
                  disabled={savingFlags}
                  className="mt-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  onClick={() => saveFlags(!!order.is_settled, true, refundNotes)}
                >
                  {savingFlags ? "Saving…" : "Save refund note"}
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveHeader}
              disabled={savingHeader}
              className="mt-4 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingHeader ? "Saving…" : "Save order changes"}
            </button>

            {lines.length === 0 && (
              <div className="mt-3">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete order
                  </button>
                ) : (
                  <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    <p className="mb-2 font-medium">Delete this order permanently?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={deleteOrder}
                        disabled={deleting}
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary cards - MATCH TABLE */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Gross</div>
                <div className="text-sm font-semibold">{fmtGBP(computed.gross)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Fees</div>
                <div className="text-sm font-semibold">{fmtGBP(computed.fees)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Payout</div>
                <div className="text-sm font-semibold">{fmtGBP(computed.payout)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Shipping</div>
                <div className="text-sm font-semibold">{fmtGBP(computed.ship)}</div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">COGS used</div>
                <div className="text-sm font-semibold">
                  {fmtGBP(computed.cogsUsed)}
                </div>
                <div className="text-[11px] text-gray-500">
                  {computed.overrideProvided ? "Override" : "FIFO"}
                </div>
              </div>
              <div className="rounded-md border bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">Profit</div>
                <div className="text-sm font-semibold">{fmtGBP(computed.profit)}</div>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Expected payout (Gross − Fees): <span className="font-semibold">{fmtGBP(computed.expectedPayout)}</span>
            </div>
          </section>

          {/* Lines read-only */}
          <section className="rounded-lg border bg-white p-4">
            <div className="font-semibold text-gray-900 mb-3">Line items</div>

            {lines.length === 0 ? (
              <div className="text-sm text-gray-600">No line items.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm bg-white">
                  <thead className="border-b bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold">Recipe</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold">Line cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.order_product_id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{l.product_name}</td>
                        <td className="px-3 py-2">{l.recipe_name}</td>
                        <td className="px-3 py-2">{l.quantity}</td>
                        <td className="px-3 py-2 font-semibold">{fmtGBP(l.line_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
