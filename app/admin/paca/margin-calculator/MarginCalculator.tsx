"use client";

import { useState, useEffect } from "react";

type PlatformFee = {
  id: string;
  name: string;
  pct: string;   // percentage fee e.g. "6.5"
  fixed: string; // fixed fee per sale e.g. "0.20"
  active: boolean;
};

const DEFAULT_PLATFORMS: PlatformFee[] = [
  { id: "etsy",    name: "Etsy",        pct: "9.5",  fixed: "0.20", active: true },
  { id: "tiktok",  name: "TikTok Shop", pct: "8.0",  fixed: "0.00", active: true },
  { id: "ebay",    name: "eBay",        pct: "12.8", fixed: "0.35", active: true },
  { id: "amazon",  name: "Amazon",      pct: "15.0", fixed: "0.00", active: true },
  { id: "ownsite", name: "Own Site",    pct: "1.8",  fixed: "0.20", active: true },
];

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
  const [shipping, setShipping] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [saleDiscount, setSaleDiscount] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [targetProfit, setTargetProfit] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.platforms) setPlatforms(data.platforms);
        if (data.cogs) setCogs(data.cogs);
        if (data.sellPrice) setSellPrice(data.sellPrice);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify({ platforms, cogs, sellPrice }));
  }, [platforms, cogs, sellPrice, loaded]);

  function addPlatform() {
    setPlatforms((p) => [...p, { id: uid(), name: "", pct: "", fixed: "", active: true }]);
  }
  function updatePlatform(id: string, field: keyof PlatformFee, val: string | boolean) {
    setPlatforms((p) => p.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }
  function removePlatform(id: string) {
    setPlatforms((p) => p.filter((x) => x.id !== id));
  }

  // Core calculation for a given sell price
  function calcForPrice(price: number, pct: number, fixed: number) {
    const totalCost = parse(cogs) + parse(shipping);
    const fees = price * (pct / 100) + fixed;
    const profit = price - totalCost - fees;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    return { fees, profit, margin };
  }

  const cogsVal = parse(cogs) + parse(shipping);
  const sellVal = parse(sellPrice);
  const discountVal = parse(saleDiscount);
  const salePriceVal = discountVal > 0 ? sellVal * (1 - discountVal / 100) : 0;

  // Reverse: price needed to hit target margin % on a platform
  function priceForMargin(targetPct: number, pct: number, fixed: number) {
    // price = (cogs + fixed) / (1 - margin/100 - pct/100)
    const denom = 1 - targetPct / 100 - pct / 100;
    if (denom <= 0) return null;
    return (cogsVal + fixed) / denom;
  }

  // Reverse: price needed to hit target profit amount on a platform
  function priceForProfit(targetP: number, pct: number, fixed: number) {
    // targetP = price - cogs - price*pct/100 - fixed
    // price * (1 - pct/100) = targetP + cogs + fixed
    const denom = 1 - pct / 100;
    if (denom <= 0) return null;
    return (targetP + cogsVal + fixed) / denom;
  }

  const activePlatforms = platforms.filter((p) => p.active);
  const hasInputs = cogsVal > 0 && sellVal > 0;

  if (!loaded) return null;

  return (
    <div className="flex flex-col gap-8">

      {/* Inputs */}
      <div className="pp-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">Product & Price</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">COGS (cost per unit)</label>
            <TInput value={cogs} onChange={setCogs} placeholder="0.54" type="number" prefix="£" className="w-36" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Shipping cost</label>
            <TInput value={shipping} onChange={setShipping} placeholder="0.00" type="number" prefix="£" className="w-36" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sell Price</label>
            <TInput value={sellPrice} onChange={setSellPrice} placeholder="3.99" type="number" prefix="£" className="w-36" />
          </div>
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
              <span className="text-slate-500">Sale price: </span>
              <span className="font-bold text-amber-600">{fmt(salePriceVal)}</span>
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
                const { fees, profit, margin } = calcForPrice(sellVal, pct, fixed);
                const sale = discountVal > 0 ? calcForPrice(salePriceVal, pct, fixed) : null;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{p.name || "—"}</td>
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
      {cogsVal > 0 && (
        <div className="pp-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
            Reverse Calculator
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            What do I need to charge to hit a target margin or profit?
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
                  <th className="text-right pb-2">Minimum sell price</th>
                </tr>
              </thead>
              <tbody>
                {activePlatforms.map((p) => {
                  const pct = parse(p.pct);
                  const fixed = parse(p.fixed);
                  const price = targetMargin
                    ? priceForMargin(parse(targetMargin), pct, fixed)
                    : priceForProfit(parse(targetProfit), pct, fixed);
                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700">{p.name || "—"}</td>
                      <td className="py-2 text-right tabular-nums font-bold text-teal-700">
                        {price !== null && price > 0 ? fmt(price) : <span className="text-red-400 font-normal">Not achievable</span>}
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
          Edit these to match current rates. % fee applied to sale price, fixed fee per transaction.
        </p>
        <div className="flex flex-col gap-3 mb-4">
          {platforms.map((p) => (
            <div key={p.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${p.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
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
