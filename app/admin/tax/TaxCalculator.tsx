"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getOrMigrateUserData, setUserData } from "../../lib/userStore";

// ── UK Tax Constants (2024/25 · 2025/26) ──────────────────────────
const PA = 12570;
const BASIC_LIMIT = 50270;
const HIGHER_LIMIT = 125140;
const BASIC_RATE = 0.20;
const HIGHER_RATE = 0.40;
const ADD_RATE = 0.45;
const DIV_ALLOWANCE = 500;
const DIV_BASIC = 0.0875;
const DIV_HIGHER = 0.3375;
const C4_LOWER = 12570;
const C4_UPPER = 50270;
const C4_MAIN = 0.06;
const C4_UPPER_RATE = 0.02;

// ── Helpers ────────────────────────────────────────────────────────
function taxYearLabel(sy: number) {
  return `${sy}/${String(sy + 1).slice(2)}`;
}
function taxYearRange(sy: number) {
  return { start: `${sy}-04-06`, endExclusive: `${sy + 1}-04-06` };
}
function getCurrentTaxYearStart() {
  const now = new Date();
  const y = now.getFullYear();
  return now >= new Date(`${y}-04-06`) ? y : y - 1;
}
function paymentDates(sy: number) {
  return {
    balancing: new Date(`${sy + 2}-01-31`),
    secondPOA: new Date(`${sy + 2}-07-31`),
  };
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}
function parse(v: string) {
  return parseFloat(v) || 0;
}

// ── Tax calculation ────────────────────────────────────────────────
function calcTax(nonDivIncome: number, dividends: number) {
  const basicBandSize = BASIC_LIMIT - PA; // £37,700

  const taxableNonDiv = Math.max(0, nonDivIncome - PA);
  const inBasic = Math.min(taxableNonDiv, basicBandSize);
  const inHigher = Math.min(Math.max(0, taxableNonDiv - basicBandSize), HIGHER_LIMIT - BASIC_LIMIT);
  const inAdditional = Math.max(0, taxableNonDiv - (HIGHER_LIMIT - PA));
  const nonDivTax = inBasic * BASIC_RATE + inHigher * HIGHER_RATE + inAdditional * ADD_RATE;

  const divTaxable = Math.max(0, dividends - DIV_ALLOWANCE);
  const basicRemaining = Math.max(0, basicBandSize - inBasic);
  const divInBasic = Math.min(divTaxable, basicRemaining);
  const divInHigher = Math.max(0, divTaxable - basicRemaining);
  const divTax = divInBasic * DIV_BASIC + divInHigher * DIV_HIGHER;

  return { nonDivTax, divTax, inBasic, inHigher, inAdditional, divTaxable, divInBasic, divInHigher };
}

function calcPAYETax(gross: number): number {
  const basicBandSize = BASIC_LIMIT - PA;
  const taxable = Math.max(0, gross - PA);
  const inBasic = Math.min(taxable, basicBandSize);
  const inHigher = Math.min(Math.max(0, taxable - basicBandSize), HIGHER_LIMIT - BASIC_LIMIT);
  const inAdditional = Math.max(0, taxable - (HIGHER_LIMIT - PA));
  return inBasic * BASIC_RATE + inHigher * HIGHER_RATE + inAdditional * ADD_RATE;
}

function calcClass4NI(profit: number) {
  if (profit <= C4_LOWER) return 0;
  const main = Math.min(profit - C4_LOWER, C4_UPPER - C4_LOWER) * C4_MAIN;
  const upper = Math.max(0, profit - C4_UPPER) * C4_UPPER_RATE;
  return main + upper;
}

// ── Types ──────────────────────────────────────────────────────────
type FinanceSettings = {
  owners_count: number;
  mileage_rate_first: number;
  mileage_rate_after: number;
  mileage_threshold: number;
};

type Entry = { id: string; date: string; amount: string };

type TaxInputs = {
  payeGross: string;
  payeTaxPaid: string;
  pacaSharePct: string;
  extraIncomeEntries: Entry[];  // Vicky: cash job payments
  dividendEntries: Entry[];     // Carrie: dividend payments
};

function uid() { return Math.random().toString(36).slice(2); }

function emptyInputs(): TaxInputs {
  return {
    payeGross: "",
    payeTaxPaid: "",
    pacaSharePct: "50",
    extraIncomeEntries: [],
    dividendEntries: [],
  };
}

// ── Input field ────────────────────────────────────────────────────
function Field({
  label, hint, prefix, value, onChange,
}: {
  label: string;
  hint?: string;
  prefix?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-200 bg-white py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 ${prefix ? "pl-7 pr-3" : "px-3"}`}
          placeholder="0"
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function TaxCalculator({ person }: { person: "carrie" | "vicky" }) {
  const isCarrie = person === "carrie";
  const storageKey = `pp-tax-calc-v2-${person}`;

  const [taxYearStart, setTaxYearStart] = useState(getCurrentTaxYearStart());
  const [inputs, setInputs] = useState<TaxInputs>(emptyInputs);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pacaLoading, setPacaLoading] = useState(false);
  const [pacaProfit, setPacaProfit] = useState<number | null>(null);

  // Load saved inputs
  useEffect(() => {
    getOrMigrateUserData<TaxInputs>(storageKey).then((saved) => {
      if (saved) setInputs(saved);
      setLoaded(true);
    });
  }, [storageKey]);

  // Auto-save inputs
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setUserData(storageKey, inputs), 600);
  }, [inputs, loaded, storageKey]);

  function set(field: keyof TaxInputs, val: string | Entry[]) {
    setInputs((p) => ({ ...p, [field]: val }));
  }

  // Load Paca profit for selected tax year
  useEffect(() => {
    setPacaLoading(true);
    const range = taxYearRange(taxYearStart);

    async function load() {
      const [osRes, exRes, miRes, setRes] = await Promise.all([
        supabase.rpc("finance_orders_summary", {
          p_from: range.start,
          p_to: range.endExclusive,
          p_platform: null,
          p_settled_only: true,
        }),
        supabase.rpc("list_expenses_in_range", { p_from: range.start, p_to: range.endExclusive }),
        supabase.rpc("list_mileage_in_range", { p_from: range.start, p_to: range.endExclusive }),
        supabase.rpc("get_finance_settings"),
      ]);

      const os = Array.isArray(osRes.data) ? osRes.data[0] : osRes.data;
      const gross = Number(os?.gross_revenue ?? 0);
      const fees = Number(os?.platform_fees ?? 0);
      const expensesTotal = ((exRes.data ?? []) as any[]).reduce(
        (s: number, e: any) => s + Number(e.amount || 0), 0
      );
      const s = (Array.isArray(setRes.data) ? setRes.data[0] : setRes.data) as FinanceSettings | undefined;
      const settings: FinanceSettings = s ?? {
        owners_count: 2,
        mileage_rate_first: 0.45,
        mileage_rate_after: 0.25,
        mileage_threshold: 10000,
      };
      const totalMiles = ((miRes.data ?? []) as any[]).reduce(
        (s: number, m: any) => s + Number(m.miles || 0), 0
      );
      const firstMiles = Math.min(totalMiles, settings.mileage_threshold);
      const afterMiles = Math.max(0, totalMiles - settings.mileage_threshold);
      const mileageClaim =
        firstMiles * settings.mileage_rate_first + afterMiles * settings.mileage_rate_after;

      setPacaProfit(gross - fees - expensesTotal - mileageClaim);
      setPacaLoading(false);
    }

    load();
  }, [taxYearStart]);

  // ── Calculate results ──────────────────────────────────────────
  const result = useMemo(() => {
    const payeGross = parse(inputs.payeGross);
    const payeTaxPaid = inputs.payeTaxPaid.trim()
      ? parse(inputs.payeTaxPaid)
      : calcPAYETax(payeGross);
    const pacaSharePct = Math.min(100, Math.max(0, parse(inputs.pacaSharePct)));
    const pacaShare = pacaProfit !== null ? Math.max(0, pacaProfit) * (pacaSharePct / 100) : 0;
    const dividends = isCarrie
      ? inputs.dividendEntries.reduce((s, e) => s + parse(e.amount), 0)
      : 0;
    const extraIncome = !isCarrie
      ? inputs.extraIncomeEntries.reduce((s, e) => s + parse(e.amount), 0)
      : 0;
    const selfEmployedProfit = pacaShare + extraIncome;
    const nonDivIncome = payeGross + selfEmployedProfit;

    const tax = calcTax(nonDivIncome, dividends);
    const class4NI = calcClass4NI(selfEmployedProfit);
    const totalOwed = tax.nonDivTax + tax.divTax + class4NI;
    const additionalOwed = totalOwed - payeTaxPaid;

    const dates = paymentDates(taxYearStart);
    const today = new Date();
    const balancingIsFuture = dates.balancing >= today;
    const nextDate = balancingIsFuture ? dates.balancing : dates.secondPOA;
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / 86400000);

    // Payments on account: if bill > £1,000, HMRC also collects 50% towards next year
    const poaApplies = additionalOwed > 1000;
    const poaAmount = poaApplies ? additionalOwed * 0.5 : 0;
    // January payment = balancing + first POA; July = second POA
    const janPayment = additionalOwed + poaAmount;
    const julPayment = poaAmount;

    // Monthly savings target — months remaining until next deadline
    const monthsUntil = Math.max(1, Math.ceil(daysUntil / 30.4));
    const monthlySavings = additionalOwed > 0 ? Math.ceil(janPayment / monthsUntil) : 0;

    return {
      payeGross, payeTaxPaid, pacaShare, selfEmployedProfit,
      extraIncome, dividends, nonDivIncome,
      totalIncome: nonDivIncome + dividends,
      ...tax, class4NI, totalOwed, additionalOwed,
      dates, nextDate, daysUntil, balancingIsFuture,
      poaApplies, poaAmount, janPayment, julPayment,
      monthsUntil, monthlySavings,
    };
  }, [inputs, pacaProfit, taxYearStart, isCarrie]);

  const availableYears = [getCurrentTaxYearStart() - 1, getCurrentTaxYearStart()];

  return (
    <div className="flex flex-col gap-6">

      {/* Tax year picker */}
      <div className="pp-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Tax Year</p>
        <div className="flex gap-2">
          {availableYears.map((sy) => (
            <button
              key={sy}
              onClick={() => setTaxYearStart(sy)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                taxYearStart === sy
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {taxYearLabel(sy)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Left: inputs ── */}
        <div className="flex flex-col gap-5">

          {/* Paca */}
          <div className="pp-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
              Paca Prints
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  Paca profit {taxYearLabel(taxYearStart)}
                </p>
                <p className="text-xl font-extrabold text-slate-900">
                  {pacaLoading ? "Loading…" : pacaProfit === null ? "—" : fmtGBP(pacaProfit)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">revenue − fees − expenses − mileage</p>
              </div>
              <Field
                label="Your share %"
                hint="What % of Paca profit is yours?"
                value={inputs.pacaSharePct}
                onChange={(v) => set("pacaSharePct", v)}
              />
              {pacaProfit !== null && !pacaLoading && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex justify-between text-sm">
                  <span className="text-slate-500">Your Paca share</span>
                  <span className="font-bold text-slate-900">{fmtGBP(result.pacaShare)}</span>
                </div>
              )}
            </div>
          </div>

          {/* PAYE */}
          <div className="pp-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
              PAYE Employment
            </h2>
            <div className="flex flex-col gap-4">
              <Field
                label="Gross PAYE salary this year"
                hint="Total before tax — add up your payslips or use your P60"
                prefix="£"
                value={inputs.payeGross}
                onChange={(v) => set("payeGross", v)}
              />
              {parse(inputs.payeGross) > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                  <span className="text-slate-500">Estimated PAYE tax (standard tax code): </span>
                  <span className="font-bold text-slate-900">
                    {fmtGBP(calcPAYETax(parse(inputs.payeGross)))}
                  </span>
                </div>
              )}
              <Field
                label="Override PAYE tax paid (optional)"
                hint="Leave blank to use the estimate above. Only fill in if your actual tax paid differs — e.g. started mid-year or non-standard tax code."
                prefix="£"
                value={inputs.payeTaxPaid}
                onChange={(v) => set("payeTaxPaid", v)}
              />
            </div>
          </div>

          {/* Vicky: extra cash income */}
          {!isCarrie && (
            <div className="pp-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                Extra Income
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                No tax deducted from this — all of it is taxable.
              </p>
              <div className="flex flex-col gap-2 mb-3">
                {inputs.extraIncomeEntries.map((e) => (
                  <div key={e.id} className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={e.date}
                      onChange={(ev) => {
                        const updated = inputs.extraIncomeEntries.map((x) =>
                          x.id === e.id ? { ...x, date: ev.target.value } : x
                        );
                        set("extraIncomeEntries", updated);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">£</span>
                      <input
                        type="number"
                        value={e.amount}
                        onChange={(ev) => {
                          const updated = inputs.extraIncomeEntries.map((x) =>
                            x.id === e.id ? { ...x, amount: ev.target.value } : x
                          );
                          set("extraIncomeEntries", updated);
                        }}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
                      />
                    </div>
                    <button
                      onClick={() =>
                        set("extraIncomeEntries", inputs.extraIncomeEntries.filter((x) => x.id !== e.id))
                      }
                      className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
                    >✕</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    set("extraIncomeEntries", [...inputs.extraIncomeEntries, { id: uid(), date: "", amount: "" }])
                  }
                  className="pp-btn pp-btn-primary text-xs px-3 py-1.5"
                >
                  + Add payment
                </button>
                {inputs.extraIncomeEntries.length > 0 && (
                  <span className="text-sm font-bold text-slate-700">
                    Total: {fmtGBP(result.extraIncome)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Carrie: dividends */}
          {isCarrie && (
            <div className="pp-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                Dividends
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Gross amount before any tax — add each payment separately.
              </p>
              <div className="flex flex-col gap-2 mb-3">
                {inputs.dividendEntries.map((e) => (
                  <div key={e.id} className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={e.date}
                      onChange={(ev) => {
                        const updated = inputs.dividendEntries.map((x) =>
                          x.id === e.id ? { ...x, date: ev.target.value } : x
                        );
                        set("dividendEntries", updated);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">£</span>
                      <input
                        type="number"
                        value={e.amount}
                        onChange={(ev) => {
                          const updated = inputs.dividendEntries.map((x) =>
                            x.id === e.id ? { ...x, amount: ev.target.value } : x
                          );
                          set("dividendEntries", updated);
                        }}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
                      />
                    </div>
                    <button
                      onClick={() =>
                        set("dividendEntries", inputs.dividendEntries.filter((x) => x.id !== e.id))
                      }
                      className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
                    >✕</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    set("dividendEntries", [...inputs.dividendEntries, { id: uid(), date: "", amount: "" }])
                  }
                  className="pp-btn pp-btn-primary text-xs px-3 py-1.5"
                >
                  + Add dividend
                </button>
                {inputs.dividendEntries.length > 0 && (
                  <span className="text-sm font-bold text-slate-700">
                    Total: {fmtGBP(result.dividends)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: results ── */}
        <div>
          <div className="pp-card-strong p-5 sticky top-24 flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Estimated Tax Bill
            </h2>

            {/* Set aside today */}
            {result.additionalOwed > 0 && (
              <div className="rounded-xl px-4 py-4 flex flex-col gap-1" style={{ background: "#1e293b" }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Set aside today</p>
                <p className="text-3xl font-extrabold tabular-nums text-white">
                  {fmtGBP(result.janPayment)}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  Move this to a separate savings account now and don&apos;t touch it — it covers your full January {new Date(result.dates.balancing).getFullYear()} payment.
                </p>
              </div>
            )}

            {/* Income summary */}
            <div className="flex flex-col gap-1.5 text-sm pb-4 border-b border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">PAYE salary</span>
                <span className="tabular-nums text-slate-700">{fmtGBP(result.payeGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paca share</span>
                <span className="tabular-nums text-slate-700">{fmtGBP(result.pacaShare)}</span>
              </div>
              {!isCarrie && result.extraIncome > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Extra cash income</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.extraIncome)}</span>
                </div>
              )}
              {isCarrie && result.dividends > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Dividends</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.dividends)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-slate-100 pt-1.5 mt-0.5">
                <span className="text-slate-700">Total income</span>
                <span className="tabular-nums">{fmtGBP(result.totalIncome)}</span>
              </div>
            </div>

            {/* Tax breakdown */}
            <div className="flex flex-col gap-1.5 text-sm pb-4 border-b border-slate-100">
              {result.inBasic > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">20% on {fmtGBP(result.inBasic)}</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.inBasic * BASIC_RATE)}</span>
                </div>
              )}
              {result.inHigher > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">40% on {fmtGBP(result.inHigher)}</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.inHigher * HIGHER_RATE)}</span>
                </div>
              )}
              {result.inAdditional > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">45% on {fmtGBP(result.inAdditional)}</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.inAdditional * ADD_RATE)}</span>
                </div>
              )}
              {isCarrie && result.divTaxable > 0 && (
                <>
                  {result.divInBasic > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Div 8.75% on {fmtGBP(result.divInBasic)}</span>
                      <span className="tabular-nums text-slate-700">{fmtGBP(result.divInBasic * DIV_BASIC)}</span>
                    </div>
                  )}
                  {result.divInHigher > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Div 33.75% on {fmtGBP(result.divInHigher)}</span>
                        <span className="tabular-nums text-slate-700">{fmtGBP(result.divInHigher * DIV_HIGHER)}</span>
                      </div>
                      <p className="text-xs text-slate-400 -mt-0.5">
                        Your salary + Paca share fills the basic rate band, so these dividends land in the higher rate band.
                      </p>
                    </>
                  )}
                </>
              )}
              {result.class4NI > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Class 4 NI on self-employed profit</span>
                  <span className="tabular-nums text-slate-700">{fmtGBP(result.class4NI)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-slate-100 pt-1.5 mt-0.5">
                <span className="text-slate-700">Total tax + NI</span>
                <span className="tabular-nums">{fmtGBP(result.totalOwed)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>
                  Less PAYE tax paid
                  {!inputs.payeTaxPaid.trim() && (
                    <span className="ml-1 text-xs text-slate-400">(estimated)</span>
                  )}
                </span>
                <span className="tabular-nums">−{fmtGBP(result.payeTaxPaid)}</span>
              </div>
            </div>

            {/* Big result */}
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background:
                  result.additionalOwed > 0 ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)",
                border: `1px solid ${
                  result.additionalOwed > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"
                }`,
              }}
            >
              <span className="text-sm font-bold text-slate-700">
                {result.additionalOwed > 0 ? "Estimated owed" : "Estimated refund"}
              </span>
              <span
                className={`text-2xl font-extrabold tabular-nums ${
                  result.additionalOwed > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {fmtGBP(Math.abs(result.additionalOwed))}
              </span>
            </div>

            {/* Monthly savings target */}
            {result.additionalOwed > 0 && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--pp-teal-soft)", border: "1px solid var(--pp-teal-border)" }}
              >
                <p className="text-xs font-semibold text-slate-600 mb-1">Monthly savings target</p>
                <p className="text-2xl font-extrabold tabular-nums text-teal-700">
                  {fmtGBP(result.monthlySavings)}<span className="text-sm font-semibold text-teal-600">/month</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {result.monthsUntil} month{result.monthsUntil !== 1 ? "s" : ""} until {fmtDate(result.nextDate)} · covers full January payment
                </p>
              </div>
            )}

            {/* Payment dates */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500">Payment deadlines</p>

              <div className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-bold text-slate-900">{fmtDate(result.dates.balancing)}</p>
                  <p className="text-xs text-slate-400">
                    {result.balancingIsFuture
                      ? `${result.daysUntil} days away`
                      : `${Math.abs(Math.ceil((result.dates.balancing.getTime() - new Date().getTime()) / 86400000))} days ago`}
                  </p>
                </div>
                {result.additionalOwed > 0 && (
                  <div className="text-right">
                    <p className="font-bold text-slate-900 tabular-nums">{fmtGBP(result.janPayment)}</p>
                    {result.poaApplies && (
                      <p className="text-xs text-slate-400">
                        {fmtGBP(result.additionalOwed)} owed + {fmtGBP(result.poaAmount)} POA
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start text-sm border-t border-slate-100 pt-2">
                <div>
                  <p className="font-bold text-slate-900">{fmtDate(result.dates.secondPOA)}</p>
                  <p className="text-xs text-slate-400">Second payment on account</p>
                </div>
                {result.poaApplies && (
                  <p className="font-bold text-slate-900 tabular-nums">{fmtGBP(result.julPayment)}</p>
                )}
              </div>

              {result.poaApplies && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  ⚠️ Your bill is over £1,000 so HMRC will collect payments on account — advance payments towards next year's bill. January is bigger than it looks.
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Rough estimate only. Doesn&apos;t account for pension contributions, marriage
              allowance, or other reliefs. Always check with an accountant for your actual bill.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
