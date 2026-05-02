
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import LineItemsSection from "./LineItemsSection";

type Option = { id: string; name: string };

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Optional money parser: "" -> null, "1.23" -> 1.23, invalid -> NaN
function parseMoneyOptional(s: string): number | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

// Required money parser: "" -> 0, invalid -> NaN
function parseMoneyRequired(s: string): number {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export default function CreateOrderPage() {
  const router = useRouter();

  const [platform, setPlatform] = useState<string>("tiktok");
  const [platformCustom, setPlatformCustom] = useState<string>("");

  const [platformRef, setPlatformRef] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(todayISO());

  // money fields (allow blanks for unsettled orders)
  const [grossRevenue, setGrossRevenue] = useState<string>(""); // what customer paid
  const [platformFees, setPlatformFees] = useState<string>(""); // total fees
  const [payout, setPayout] = useState<string>(""); // what you receive (orders.revenue)
  const [shippingCost, setShippingCost] = useState<string>(""); // shipping cost to you
  const [discounts, setDiscounts] = useState<string>(""); // optional

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [products, setProducts] = useState<Option[]>([]);
  const [recipes, setRecipes] = useState<Option[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);

  const effectivePlatform = useMemo(() => {
    if (platform === "custom") return platformCustom.trim();
    return platform;
  }, [platform, platformCustom]);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setErrorMsg("");

      try {
        const { data: productsData, error: pErr } = await supabase
          .from("products")
          .select("id,name")
          .order("name", { ascending: true });
        if (pErr) throw pErr;

        const { data: recipesData, error: rErr } = await supabase
          .from("recipes")
          .select("id,name")
          .order("name", { ascending: true });
        if (rErr) throw rErr;

        if (cancelled) return;
        setProducts((productsData ?? []) as Option[]);
        setRecipes((recipesData ?? []) as Option[]);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? "Failed to load products/recipes");
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setErrorMsg("");

    // Basic validation
    if (!orderDate) return setErrorMsg("Please select an order date.");
    if (!effectivePlatform) return setErrorMsg("Please select a platform (or enter custom).");
    if (!lineItems || lineItems.length === 0) return setErrorMsg("Please add at least 1 line item.");

    // Validate line items before saving anything
    for (const line of lineItems) {
      if (!line?.recipe_id) return setErrorMsg("Each line needs a recipe selected.");
      if (!line?.product_name || !String(line.product_name).trim())
        return setErrorMsg("Each line needs a product name.");
      if (!line?.quantity || Number(line.quantity) < 1)
        return setErrorMsg("Each line needs a quantity of 1 or more.");
    }

    // Parse numbers (allow blanks for gross/fees/payout/discounts)
    const grossNum = parseMoneyOptional(grossRevenue);
    const feesNum = parseMoneyOptional(platformFees);
    const payoutNum = parseMoneyRequired(payout); // create_order needs a number, so blank becomes 0
    const shipNum = parseMoneyRequired(shippingCost); // blank becomes 0
    const discNum = parseMoneyOptional(discounts);

    if (grossNum !== null && !Number.isFinite(grossNum))
      return setErrorMsg("Customer paid (gross) must be a number.");
    if (feesNum !== null && !Number.isFinite(feesNum))
      return setErrorMsg("Platform fees must be a number.");
    if (!Number.isFinite(payoutNum)) return setErrorMsg("Payout must be a number.");
    if (!Number.isFinite(shipNum)) return setErrorMsg("Shipping cost must be a number.");
    if (discNum !== null && !Number.isFinite(discNum)) return setErrorMsg("Discounts must be a number.");

    setSaving(true);

    try {
      // 1) Create order header (payout + shipping are required numeric fields in your existing RPC)
      const { data: orderId, error: headerErr } = await supabase.rpc("create_order", {
        p_order_date: orderDate,
        p_customer_name: customerName.trim() || null,
        p_platform: effectivePlatform,
        p_platform_order_ref: platformRef.trim() || null,
        p_revenue: payoutNum, // net payout (can be 0 if not settled yet)
        p_shipping_cost: shipNum,
        p_discounts: discNum ?? 0,
      });

      if (headerErr) throw headerErr;

      // 2) Immediately set the full money breakdown (gross + fees + payout + shipping + discounts)
      //    (gross/fees can be null when not settled yet)
      const { error: moneyErr } = await supabase.rpc("update_order_money", {
        p_order_id: orderId,
        p_gross_revenue: grossNum,
        p_platform_fees: feesNum ?? 0,
        p_payout: payoutNum,
        p_shipping_cost: shipNum,
        p_discounts: discNum ?? 0,
      });

      if (moneyErr) throw moneyErr;

      // 3) Save ALL line items (FIFO costing happens via trigger)
      for (const line of lineItems) {
        const name = String(line.product_name).trim();

        // find product id (or create)
        const { data: productRow, error: findErr } = await supabase
          .from("products")
          .select("id")
          .eq("name", name)
          .maybeSingle();

        if (findErr) throw findErr;

        let productId = productRow?.id;

        if (!productId) {
          const { data: newProduct, error: newProductError } = await supabase
            .from("products")
            .insert({ name })
            .select("id")
            .single();

          if (newProductError) throw newProductError;
          productId = newProduct.id;
        }

        const { error: lineErr } = await supabase.rpc("add_order_product", {
          p_order_id: orderId,
          p_recipe_id: line.recipe_id,
          p_quantity: Number(line.quantity),
          p_product_id: productId,
        });

        if (lineErr) throw lineErr;
      }

      router.push("/orders");
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to save order");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <main className="p-4 sm:p-6 max-w-xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add order</h1>
        <Link href="/orders" className="text-sm text-gray-600 underline">
          Cancel
        </Link>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-4 pb-24">
        {/* Platform */}
        <div className="rounded-lg border bg-white p-4">
          <label className="block text-sm font-semibold text-gray-900 mb-1">Platform</label>
          <select
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="tiktok">TikTok</option>
            <option value="shopify">Shopify</option>
            <option value="etsy">Etsy</option>
            <option value="ebay">eBay</option>
            <option value="custom">Custom</option>
          </select>

          {platform === "custom" ? (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom platform</label>
              <input
                type="text"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={platformCustom}
                onChange={(e) => setPlatformCustom(e.target.value)}
                placeholder="e.g. Instagram"
              />
            </div>
          ) : null}
        </div>

        {/* Details */}
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Platform order reference
            </label>
            <input
              type="text"
              placeholder="Order ID / reference"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              value={platformRef}
              onChange={(e) => setPlatformRef(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Customer name</label>
            <input
              type="text"
              placeholder="Optional"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Order date</label>
              <input
                type="date"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Customer paid (gross)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="£0.00"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={grossRevenue}
                onChange={(e) => setGrossRevenue(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Platform fees</label>
              <input
                type="number"
                step="0.01"
                placeholder="£0.00"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={platformFees}
                onChange={(e) => setPlatformFees(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Payout (net)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="£0.00"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Shipping cost</label>
              <input
                type="number"
                step="0.01"
                placeholder="£0.00"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Discounts</label>
              <input
                type="number"
                step="0.01"
                placeholder="£0.00"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                value={discounts}
                onChange={(e) => setDiscounts(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            You can leave gross/fees/payout blank if the order isn’t settled yet — you can edit later.
            (Blank payout saves as £0.00 for now.)
          </p>
        </div>

        {/* Line items */}
        <LineItemsSection
          products={products}
          recipes={recipes}
          value={lineItems}
          onChange={setLineItems}
        />
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur">
        <div className="max-w-xl mx-auto p-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${
              saving ? "bg-gray-300 text-gray-700" : "bg-gray-900 text-white"
            }`}
          >
            {saving ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </main>
  );
}
