"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

type MaterialOption = { material_id: string; material_name: string; avg_cost: number | null };

type PlatformFee = {
  id: string;
  name: string;
  pct: string;          // % fee on sale
  fixed: string;        // fixed fee per transaction
  feesOnShipping: boolean; // does the % fee apply to buyer shipping too?
  active: boolean;
};

const DEFAULT_PLATFORMS: PlatformFee[] = [
  { id: "etsy",    name: "Etsy",        pct: "10.5", fixed: "0.40", feesOnShipping: true,  active: true },
  { id: "tiktok",  name: "TikTok Shop", pct: "8.0",  fixed: "0.00", feesOnShipping: false, active: true },
  { id: "ebay",    name: "eBay",        pct: "12.8", fixed: "0.35", feesOnShipping: true,  active: true },
  { id: "amazon",  name: "Amazon",      pct: "15.0", fixed: "0.00", feesOnShipping: false, active: true },
  { id: "ownsite", name: "Own Site",    pct: "1.8",  fixed: "0.20", feesOnShipping: false, active: true },
];

type CostLine = {
  id: string;
  name: string;
  mode: "each" | "pack"; // price per item, or a pack price spread across a quantity
  price: string;         // price each, or the pack price
  packQty: string;       // pack mode only — e.g. 100 for £9.99
  uses: string;          // how many go into one product
};

function newCostLine(): CostLine {
  return { id: uid(), name: "", mode: "each", price: "", packQty: "", uses: "1" };
}

// Cost one material adds to one finished product
function lineCost(l: CostLine) {
  const each = l.mode === "each" ? parse(l.price) : parse(l.packQty) > 0 ? parse(l.price) / parse(l.packQty) : 0;
  const uses = l.uses === "" ? 1 : parse(l.uses);
  return { each, total: each * uses };
}

// Small amounts read better in pence, keeping fractions of a penny
function fmtUnit(n: number) {
  return n < 1 ? `${parseFloat((n * 100).toFixed(2))}p` : fmt(n);
}

function uid() { return Math.random().toString(36).slice(2); }
function parse(v: string) { return parseFloat(v) || 0; }
function fmt(n: number) { return `£${n.toFixed(2)}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

function TInput({
  value, onChange, placeholder, className = "", type = "text", prefix,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; type?: string; prefix?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 ${prefix ? "pl-7" : ""} ${className}`}
      />
    </div>
  );
}

function profitColour(margin: number) {
  if (margin >= 40) return "text-emerald-600";
  if (margin >= 20) return "text-amber-500";
  return "text-red-500";
}

export default function MarginCalculator() {
  const storageKey = "pp-margin-calc-v1";
  const [platforms, setPlatforms] = useState<PlatformFee[]>(DEFAULT_PLATFORMS);
  const [loaded, setLoaded] = useState(false);

  const [cogs, setCogs] = useState("");
  const [ourShipping, setOurShipping] = useState("");   // what WE pay to ship
  const [sellPrice, setSellPrice] = useState("");        // product price charged to buyer
  const [buyerShipping, setBuyerShipping] = useState(""); // shipping charged to buyer (0 = free)
  const [saleDiscount, setSaleDiscount] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [targetProfit, setTargetProfit] = useState("");
  const [costLines, setCostLines] = useState<CostLine[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);

  // Raw materials from the Materials page, with their average cost per unit
  useEffect(() => {
    supabase.rpc("list_materials_summary", { p_search: null }).then(({ data }) => {
      const rows = (data ?? []) as MaterialOption[];
      setMaterials([...rows].sort((a, b) => a.material_name.localeCompare(b.material_name)));
    });
  }, []);

  function addMaterialLine(materialId: string) {
    const m = materials.find((x) => x.material_id === materialId);
    if (!m) return;
    const cost = m.avg_cost === null ? "" : String(Number(Number(m.avg_cost).toFixed(4)));
    setCostLines((ls) => [...ls, { ...newCostLine(), name: m.material_name, price: cost }]);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.platforms) setPlatforms(data.platforms);
        if (data.costLines) setCostLines(data.costLines);
        if (data.cogs) setCogs(data.cogs);
        if (data.sellPrice) setSellPrice(data.sellPrice);
        if (data.ourShipping) setOurShipping(data.ourShipping);
        if (data.buyerShipping) setBuyerShipping(data.buyerShipping);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify({ platforms, cogs, sellPrice, ourShipping, buyerShipping, costLines }));
  }, [platforms, cogs, sellPrice, ourShipping, buyerShipping, costLines, loaded]);

  function updateCostLine(id: string, patch: Partial<CostLine>) {
    setCostLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  const costingsTotal = costLines.reduce((sum, l) => sum + lineCost(l).total, 0);

  function addPlatform() {
    setPlatforms((p) => [...p, { id: uid(), name: "", pct: "", fixed: "", feesOnShipping: false, active: true }]);
  }
  function updatePlatform(id: string, field: keyof PlatformFee, val: string | boolean) {
    setPlatforms((p) => p.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }
  function removePlatform(id: string) {
    setPlatforms((p) => p.filter((x) => x.id !== id));
  }

  // Revenue = product price + buyer shipping
  // Fees = pct% of (product + optionally buyer shipping) + fixed
  // Cost = cogs + our shipping
  // Profit = revenue - cost - fees
  function calcForPrice(productPrice: number, pct: number, fixed: number, feeOnShip: boolean) {
    const bShip = parse(buyerShipping);
    const revenue = productPrice + bShip;
    const feeBase = productPrice + (feeOnShip ? bShip : 0);
    const fees = feeBase * (pct / 100) + fixed;
    const cost = parse(cogs) + parse(ourShipping);
    const profit = revenue - cost - fees;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, fees, profit, margin };
  }

  // Reverse: minimum product price to hit target margin %
  // m_r*(price+S) = price+S - cost - P*(price + fs*S) - fixed
  // price*(m_r - 1 + P) = S*(1 - m_r - P*fs) - cost - fixed
  function priceForMargin(targetPct: number, pct: number, fixed: number, feeOnShip: boolean) {
    const m = targetPct / 100;
    const P = pct / 100;
    const S = parse(buyerShipping);
    const fs = feeOnShip ? 1 : 0;
    const cost = parse(cogs) + parse(ourShipping);
    const denom = m - 1 + P;
    if (denom === 0) return null;
    const price = (S * (1 - m - P * fs) - cost - fixed) / denom;
    return price > 0 ? price : null;
  }

  // Reverse: minimum product price to hit target profit
  // targetP = price*(1-P) + S*(1-P*fs) - cost - fixed
  // price = (targetP - S*(1-P*fs) + cost + fixed) / (1-P)
  function priceForProfit(targetP: number, pct: number, fixed: number, feeOnShip: boolean) {
    const P = pct / 100;
    const S = parse(buyerShipping);
    const fs = feeOnShip ? 1 : 0;
    const cost = parse(cogs) + parse(ourShipping);
    const denom = 1 - P;
    if (denom <= 0) return null;
    const price = (targetP - S * (1 - P * fs) + cost + fixed) / denom;
    return price > 0 ? price : null;
  }

  const totalCost = parse(cogs) + parse(ourShipping);
  const sellVal = parse(sellPrice);
  const discountVal = parse(saleDiscount);
  const salePriceVal = discountVal > 0 ? sellVal * (1 - discountVal / 100) : 0;

  const activePlatforms = platforms.filter((p) => p.active);
  const hasInputs = totalCost > 0 && sellVal > 0;

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-8">

      {/* COGS costings */}
      <div className="pp-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-1">Work out COGS</h2>
        <p className="text-xs text-slate-400 mb-4">
          Add rough costs for each material — either the price each (e.g. 7p = 0.07) or a pack price (e.g. £9.99 for 100) — or pick from your existing materials. It works out the cost per product.
        </p>

        {costLines.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            {costLines.map((l) => {
              const { each, total } = lineCost(l);
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <input
                    type="text"
                    value={l.name}
                    onChange={(e) => updateCostLine(l.id, { name: e.target.value })}
                    placeholder="e.g. Envelope"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 flex-1 min-w-32"
                  />

                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                    {(["each", "pack"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => updateCostLine(l.id, { mode: m })}
                        className={`px-2.5 py-1.5 transition ${l.mode === m ? "bg-teal-500 text-white" : "bg-slate-50 text-slate-500"}`}
                      >
                        {m === "each" ? "Price each" : "Pack price"}
                      </button>
                    ))}
                  </div>

                  <TInput value={l.price} onChange={(v) => updateCostLine(l.id, { price: v })} placeholder={l.mode === "each" ? "0.07" : "9.99"} type="number" prefix="£" className="w-24" />

                  {l.mode === "pack" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">for</span>
                      <TInput value={l.packQty} onChange={(v) => updateCostLine(l.id, { packQty: v })} placeholder="100" type="number" className="w-20" />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">×</span>
                    <TInput value={l.uses} onChange={(v) => updateCostLine(l.id, { uses: v })} placeholder="1" type="number" className="w-16" />
                    <span className="text-xs text-slate-400">per product</span>
                  </div>

                  <div className="ml-auto text-right text-xs text-slate-400 tabular-nums min-w-24">
                    {l.mode === "pack" && each > 0 && <div>{fmtUnit(each)} each</div>}
                    <div className="text-sm font-semibold text-slate-700">{fmtUnit(total)}</div>
                  </div>

                  <button
                    onClick={() => setCostLines((ls) => ls.filter((x) => x.id !== l.id))}
                    className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setCostLines((ls) => [...ls, newCostLine()])} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
            + Add Cost
          </button>
          {materials.length > 0 && (
            <select
              value=""
              onChange={(e) => addMaterialLine(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
            >
              <option value="">+ From my materials…</option>
              {materials.map((m) => (
                <option key={m.material_id} value={m.material_id}>
                  {m.material_name}{m.avg_cost === null ? " (no cost yet)" : ` — ${fmtUnit(Number(m.avg_cost))} each`}
                </option>
              ))}
            </select>
          )}
          {costLines.length > 0 && (
            <>
              <span className="text-sm text-slate-500">
                Cost per product: <strong className="text-teal-700">{fmt(costingsTotal)}</strong>
              </span>
              <button
                onClick={() => setCogs(costingsTotal.toFixed(2))}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
              >
                Use as COGS ↓
              </button>
              <button
                onClick={() => setCostLines([])}
                className="text-xs text-slate-400 hover:text-red-500 transition"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inputs */}
      <div className="pp-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-1">Product & Price</h2>
        <p className="text-xs text-slate-400 mb-4">Enter your costs and what the buyer pays. Buyer shipping can be 0 for free delivery.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">COGS</label>
            <TInput value={cogs} onChange={setCogs} placeholder="0.54" type="number" prefix="£" className="w-full" />
            <p className="text-xs text-slate-400 mt-1">Cost of product</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Our shipping cost</label>
            <TInput value={ourShipping} onChange={setOurShipping} placeholder="0.00" type="number" prefix="£" className="w-full" />
            <p className="text-xs text-slate-400 mt-1">What we pay to ship</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sell price</label>
            <TInput value={sellPrice} onChange={setSellPrice} placeholder="3.79" type="number" prefix="£" className="w-full" />
            <p className="text-xs text-slate-400 mt-1">Product price to buyer</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Buyer shipping</label>
            <TInput value={buyerShipping} onChange={setBuyerShipping} placeholder="0.00" type="number" prefix="£" className="w-full" />
            <p className="text-xs text-slate-400 mt-1">What buyer pays for P&P</p>
          </div>
        </div>

        {totalCost > 0 && sellVal > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Revenue: <strong className="text-slate-700">{fmt(sellVal + parse(buyerShipping))}</strong></span>
            <span>·</span>
            <span>Total cost to us: <strong className="text-slate-700">{fmt(totalCost)}</strong></span>
          </div>
        )}

        {/* Sale discount */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sale Discount</label>
            <div className="relative">
              <input
                type="number"
                value={saleDiscount}
                onChange={(e) => setSaleDiscount(e.target.value)}
                placeholder="0"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 pr-7 w-28"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
            </div>
          </div>
          {discountVal > 0 && sellVal > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-sm">
              <span className="text-slate-500">Sale product price: </span>
              <span className="font-bold text-amber-600">{fmt(salePriceVal)}</span>
              <span className="text-slate-400 mx-1">·</span>
              <span className="text-slate-500">Total revenue: </span>
              <span className="font-bold text-amber-600">{fmt(salePriceVal + parse(buyerShipping))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results table */}
      {hasInputs && (
        <div className="pp-card p-5 overflow-x-auto">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
            Profit by Platform
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="text-left pb-2 pr-4">Platform</th>
                <th className="text-right pb-2 pr-4">Revenue</th>
                <th className="text-right pb-2 pr-4">Fees</th>
                <th className="text-right pb-2 pr-4">Profit</th>
                <th className="text-right pb-2 pr-4">Margin</th>
                {discountVal > 0 && (
                  <>
                    <th className="text-right pb-2 pr-4 text-amber-500">Sale Profit</th>
                    <th className="text-right pb-2 text-amber-500">Sale Margin</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activePlatforms.map((p) => {
                const pct = parse(p.pct);
                const fixed = parse(p.fixed);
                const { revenue, fees, profit, margin } = calcForPrice(sellVal, pct, fixed, p.feesOnShipping);
                const sale = discountVal > 0 ? calcForPrice(salePriceVal, pct, fixed, p.feesOnShipping) : null;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-medium text-slate-700">{p.name || "—"}</span>
                      {p.feesOnShipping && parse(buyerShipping) > 0 && (
                        <span className="ml-2 text-xs text-slate-400">fees incl. P&P</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{fmt(revenue)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{fmt(fees)}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums font-semibold ${profitColour(margin)}`}>
                      {fmt(profit)}
                    </td>
                    <td className={`py-2 pr-4 text-right tabular-nums font-semibold ${profitColour(margin)}`}>
                      {fmtPct(margin)}
                    </td>
                    {sale && (
                      <>
                        <td className={`py-2 pr-4 text-right tabular-nums font-semibold ${profitColour(sale.margin)}`}>
                          {fmt(sale.profit)}
                        </td>
                        <td className={`py-2 text-right tabular-nums font-semibold ${profitColour(sale.margin)}`}>
                          {fmtPct(sale.margin)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">
            Green = 40%+ margin · Amber = 20–40% · Red = under 20%
          </p>
        </div>
      )}

      {/* Reverse calculator */}
      {totalCost > 0 && (
        <div className="pp-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
            Reverse Calculator
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            What product price do I need to charge to hit a target? Buyer shipping is factored in.
          </p>
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Margin %</label>
              <div className="relative">
                <input
                  type="number"
                  value={targetMargin}
                  onChange={(e) => { setTargetMargin(e.target.value); setTargetProfit(""); }}
                  placeholder="30"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 pr-7 w-28"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
              </div>
            </div>
            <div className="text-slate-400 text-sm self-center pb-0.5">or</div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Profit</label>
              <TInput
                value={targetProfit}
                onChange={(v) => { setTargetProfit(v); setTargetMargin(""); }}
                placeholder="1.00"
                type="number"
                prefix="£"
                className="w-28"
              />
            </div>
          </div>

          {(targetMargin || targetProfit) && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 pr-4">Platform</th>
                  <th className="text-right pb-2">Min product price</th>
                </tr>
              </thead>
              <tbody>
                {activePlatforms.map((p) => {
                  const pct = parse(p.pct);
                  const fixed = parse(p.fixed);
                  const price = targetMargin
                    ? priceForMargin(parse(targetMargin), pct, fixed, p.feesOnShipping)
                    : priceForProfit(parse(targetProfit), pct, fixed, p.feesOnShipping);
                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700">{p.name || "—"}</td>
                      <td className="py-2 text-right tabular-nums font-bold text-teal-700">
                        {price !== null ? fmt(price) : <span className="text-red-400 font-normal">Not achievable</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Platform fee settings */}
      <div className="pp-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-1">Platform Fees</h2>
        <p className="text-xs text-slate-400 mb-4">
          Edit rates to match current. Toggle &ldquo;fees incl. P&P&rdquo; if the platform charges its % fee on buyer shipping too (Etsy and eBay do — TikTok does not).
        </p>
        <div className="flex flex-col gap-3 mb-4">
          {platforms.map((p) => (
            <div key={p.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${p.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
              {/* Active toggle */}
              <button
                onClick={() => updatePlatform(p.id, "active", !p.active)}
                className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${p.active ? "bg-teal-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.active ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>

              <input
                type="text"
                value={p.name}
                onChange={(e) => updatePlatform(p.id, "name", e.target.value)}
                placeholder="Platform name"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 flex-1 min-w-32"
              />

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={p.pct}
                  onChange={(e) => updatePlatform(p.id, "pct", e.target.value)}
                  placeholder="0"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 w-20"
                />
                <span className="text-xs text-slate-400">% fee</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">£</span>
                  <input
                    type="number"
                    value={p.fixed}
                    onChange={(e) => updatePlatform(p.id, "fixed", e.target.value)}
                    placeholder="0.00"
                    className="rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 w-24"
                  />
                </div>
                <span className="text-xs text-slate-400">fixed</span>
              </div>

              {/* feesOnShipping toggle */}
              <button
                onClick={() => updatePlatform(p.id, "feesOnShipping", !p.feesOnShipping)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                  p.feesOnShipping
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
                title="Does this platform charge its % fee on buyer shipping too?"
              >
                <span>{p.feesOnShipping ? "✓" : "—"}</span>
                fees incl. P&P
              </button>

              <button
                onClick={() => removePlatform(p.id)}
                className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={addPlatform} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
          + Add Platform
        </button>
      </div>
    </div>
  );
}
