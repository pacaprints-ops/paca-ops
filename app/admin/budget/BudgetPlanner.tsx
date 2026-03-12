"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Income = { id: string; label: string; amount: string };
type FixedOutgoing = {
  id: string;
  label: string;
  amount: string;
  bank: string;
  date: string;
  category: string;
};
type AdhocItem = { id: string; label: string; amount: string };
type PersonBudget = {
  income: Income[];
  fixed: FixedOutgoing[];
  adhoc: AdhocItem[];
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2);
}
function parse(v: string) {
  return parseFloat(v) || 0;
}
function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}
function emptyBudget(): PersonBudget {
  return { income: [], fixed: [], adhoc: [] };
}

const CATEGORIES = [
  "",
  "Rent / Mortgage",
  "Council Tax",
  "Gas",
  "Electric",
  "Water",
  "Internet",
  "Phone",
  "TV Licence",
  "Insurance",
  "Loan / Credit Card",
  "Subscription",
  "Other",
];

// ── Input helpers ──────────────────────────────────────────────────────────
function TInput({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 ${className}`}
    />
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
      title="Remove"
    >
      ✕
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
      {children}
    </h2>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BudgetPlanner({ person }: { person: string }) {
  const storageKey = `pp-budget-v1-${person}`;
  const [data, setData] = useState<PersonBudget>(emptyBudget);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setData(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, loaded, storageKey]);

  function update(patch: Partial<PersonBudget>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  // ── Income ──
  function addIncome() {
    update({ income: [...data.income, { id: uid(), label: "", amount: "" }] });
  }
  function setIncome(id: string, field: keyof Income, val: string) {
    update({ income: data.income.map((i) => (i.id === id ? { ...i, [field]: val } : i)) });
  }
  function removeIncome(id: string) {
    update({ income: data.income.filter((i) => i.id !== id) });
  }

  // ── Fixed ──
  function addFixed() {
    update({
      fixed: [
        ...data.fixed,
        { id: uid(), label: "", amount: "", bank: "", date: "", category: "" },
      ],
    });
  }
  function setFixed(id: string, field: keyof FixedOutgoing, val: string) {
    update({ fixed: data.fixed.map((f) => (f.id === id ? { ...f, [field]: val } : f)) });
  }
  function removeFixed(id: string) {
    update({ fixed: data.fixed.filter((f) => f.id !== id) });
  }

  // ── Ad-hoc ──
  function addAdhoc() {
    update({ adhoc: [...data.adhoc, { id: uid(), label: "", amount: "" }] });
  }
  function setAdhoc(id: string, field: keyof AdhocItem, val: string) {
    update({ adhoc: data.adhoc.map((a) => (a.id === id ? { ...a, [field]: val } : a)) });
  }
  function removeAdhoc(id: string) {
    update({ adhoc: data.adhoc.filter((a) => a.id !== id) });
  }

  // ── Totals ──
  const totalIncome = data.income.reduce((s, i) => s + parse(i.amount), 0);
  const totalFixed = data.fixed.reduce((s, f) => s + parse(f.amount), 0);
  const afterFixed = totalIncome - totalFixed;
  const totalAdhoc = data.adhoc.reduce((s, a) => s + parse(a.amount), 0);
  const totalOut = totalFixed + totalAdhoc;
  const remaining = totalIncome - totalOut;

  if (!loaded) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Left / centre columns ── */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Income */}
        <div className="pp-card p-5">
          <SectionHeader>💰 Income</SectionHeader>
          {data.income.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">No income added yet.</p>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {data.income.map((inc) => (
              <div key={inc.id} className="flex gap-2 items-center">
                <TInput
                  value={inc.label}
                  onChange={(v) => setIncome(inc.id, "label", v)}
                  placeholder="e.g. Salary, Freelance"
                  className="flex-1"
                />
                <TInput
                  value={inc.amount}
                  onChange={(v) => setIncome(inc.id, "amount", v)}
                  placeholder="0.00"
                  type="number"
                  className="w-28"
                />
                <DeleteBtn onClick={() => removeIncome(inc.id)} />
              </div>
            ))}
          </div>
          <button onClick={addIncome} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
            + Add Income
          </button>
        </div>

        {/* Fixed Outgoings */}
        <div className="pp-card p-5">
          <SectionHeader>📋 Fixed Monthly Outgoings</SectionHeader>
          {data.fixed.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">No fixed outgoings added yet.</p>
          )}
          <div className="flex flex-col gap-3 mb-3">
            {data.fixed.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap gap-2 items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <TInput
                  value={f.label}
                  onChange={(v) => setFixed(f.id, "label", v)}
                  placeholder="Description"
                  className="flex-1 min-w-32"
                />
                <TInput
                  value={f.amount}
                  onChange={(v) => setFixed(f.id, "amount", v)}
                  placeholder="0.00"
                  type="number"
                  className="w-24"
                />
                <DeleteBtn onClick={() => removeFixed(f.id)} />
                <TInput
                  value={f.bank}
                  onChange={(v) => setFixed(f.id, "bank", v)}
                  placeholder="Bank / Card"
                  className="flex-1 min-w-28"
                />
                <TInput
                  value={f.date}
                  onChange={(v) => setFixed(f.id, "date", v)}
                  placeholder="Day (e.g. 1st)"
                  className="w-28"
                />
                <select
                  value={f.category}
                  onChange={(e) => setFixed(f.id, "category", e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 flex-1 min-w-36"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c || "Category…"}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button onClick={addFixed} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
            + Add Fixed Outgoing
          </button>
        </div>

        {/* Ad-hoc */}
        <div className="pp-card p-5">
          <SectionHeader>📝 Ad-hoc This Month</SectionHeader>
          <p className="text-xs text-slate-400 mb-3">
            One-offs, savings, birthday money — anything not fixed.
          </p>
          {data.adhoc.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">Nothing added yet.</p>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {data.adhoc.map((a) => (
              <div key={a.id} className="flex gap-2 items-center">
                <TInput
                  value={a.label}
                  onChange={(v) => setAdhoc(a.id, "label", v)}
                  placeholder="e.g. Birthday fund, Savings pot"
                  className="flex-1"
                />
                <TInput
                  value={a.amount}
                  onChange={(v) => setAdhoc(a.id, "amount", v)}
                  placeholder="0.00"
                  type="number"
                  className="w-28"
                />
                <DeleteBtn onClick={() => removeAdhoc(a.id)} />
              </div>
            ))}
          </div>
          <button onClick={addAdhoc} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
            + Add Item
          </button>
        </div>
      </div>

      {/* ── Summary sidebar ── */}
      <div>
        <div className="pp-card-strong p-5 sticky top-24">
          <SectionHeader>📊 Summary</SectionHeader>

          {/* Income breakdown */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Income</p>
            {data.income.map((i) => (
              <div key={i.id} className="flex justify-between text-sm py-0.5">
                <span className="text-slate-600 truncate max-w-40">{i.label || "—"}</span>
                <span className="tabular-nums text-slate-800">{fmt(parse(i.amount))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-100 mt-1">
              <span>Total Income</span>
              <span className="text-emerald-600 tabular-nums">{fmt(totalIncome)}</span>
            </div>
          </div>

          {/* Fixed breakdown */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Fixed Outgoings</p>
            {data.fixed.map((f) => (
              <div key={f.id} className="flex justify-between text-sm py-0.5">
                <span className="text-slate-600 truncate max-w-40">{f.label || "—"}</span>
                <span className="tabular-nums text-slate-800">{fmt(parse(f.amount))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-100 mt-1">
              <span>Total Fixed</span>
              <span className="text-red-500 tabular-nums">{fmt(totalFixed)}</span>
            </div>
          </div>

          {/* After fixed */}
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{
              background: "var(--pp-teal-soft)",
              border: "1px solid var(--pp-teal-border)",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">After Fixed</span>
              <span className={`font-extrabold tabular-nums ${afterFixed >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {fmt(afterFixed)}
              </span>
            </div>
          </div>

          {/* Ad-hoc breakdown */}
          {data.adhoc.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Ad-hoc</p>
              {data.adhoc.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-slate-600 truncate max-w-40">{a.label || "—"}</span>
                  <span className="tabular-nums text-slate-800">{fmt(parse(a.amount))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-100 mt-1">
                <span>Total Ad-hoc</span>
                <span className="text-red-500 tabular-nums">{fmt(totalAdhoc)}</span>
              </div>
            </div>
          )}

          {/* Final totals */}
          <div className="border-t-2 border-slate-200 pt-4 flex flex-col gap-1">
            <div className="flex justify-between text-sm py-1">
              <span className="font-medium text-slate-600">Total Outgoings</span>
              <span className="font-bold text-red-500 tabular-nums">{fmt(totalOut)}</span>
            </div>
            <div
              className="flex items-center justify-between rounded-xl px-3 py-3 mt-2"
              style={{
                background: remaining >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${remaining >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              <span className="text-sm font-bold text-slate-700">Money Left</span>
              <span
                className={`text-xl font-extrabold tabular-nums ${
                  remaining >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {fmt(remaining)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
