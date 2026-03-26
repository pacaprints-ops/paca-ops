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

type TaxInputs = {
  payeGross: string;
  payeTaxPaid: string;
  pacaSharePct: string;
  extraIncome: string;  // Vicky: cash job
  dividends: string;    // Carrie: dividends
};

function emptyInputs(): TaxInputs {
  return { payeGross: "", payeTaxPaid: "", pacaSharePct: "50", extraIncome: "", dividends: "" };
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
  const storageKey = `pp-tax-calc-v1-${person}`;

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

  function set(field: keyof TaxInputs, val: string) {
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
    const dividends = isCarrie ? parse(inputs.dividends) : 0;
    const extraIncome = !isCarrie ? parse(inputs.extraIncome) : 0;
    const selfEmployedProfit = pacaShare + extraIncome;
    const nonDivIncome = payeGross + selfEmployedProfit;

    const tax = calcTax(nonDivIncome, dividends);
    const class4NI = calcClass4NI(selfEmployedProfit);
    const totalOwed = tax.nonDivTax + tax.divTax + class4NI;
    const additionalOwed = totalOwed - payeTaxPaid;

    const dates = paymentDates(taxYearStart);
    const today = new Date();
    const nextDate = dates.balancing >= today ? dates.balancing : dates.secondPOA;
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / 86400000);

    return {
      payeGross, payeTaxPaid, pacaShare, selfEmployedProfit,
      extraIncome, dividends, nonDivIncome,
      totalIncome: nonDivIncome + dividends,
      ...tax, class4NI, totalOwed, additionalOwed,
      dates, nextDate, daysUntil,
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
              <Field
                label="Total cash income this tax year"
                hint="Your extra job — no tax deducted, so all of it is taxable"
                prefix="£"
                value={inputs.extraIncome}
                onChange={(v) => set("extraIncome", v)}
              />
            </div>
          )}

          {/* Carrie: dividends */}
          {isCarrie && (
            <div className="pp-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                Dividends
              </h2>
              <Field
                label="Total dividends received this tax year"
                hint="All dividends from your other company — gross amount before any tax"
                prefix="£"
                value={inputs.dividends}
                onChange={(v) => set("dividends", v)}
              />
            </div>
          )}
        </div>

        {/* ── Right: results ── */}
        <div>
          <div className="pp-card-strong p-5 sticky top-24 flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Estimated Tax Bill
            </h2>

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
                    <div className="flex justify-between">
                      <span className="text-slate-500">Div 33.75% on {fmtGBP(result.divInHigher)}</span>
                      <span className="tabular-nums text-slate-700">{fmtGBP(result.divInHigher * DIV_HIGHER)}</span>
                    </div>
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

            {/* Payment deadline */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Next payment deadline</p>
              <p className="text-base font-bold text-slate-900">{fmtDate(result.nextDate)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {result.daysUntil > 0
                  ? `${result.daysUntil} days away`
                  : result.daysUntil === 0
                  ? "Today!"
                  : `${Math.abs(result.daysUntil)} days ago (overdue)`}
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                All {taxYearLabel(taxYearStart)} deadlines:{" "}
                {fmtDate(result.dates.balancing)} · {fmtDate(result.dates.secondPOA)}
              </p>
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
