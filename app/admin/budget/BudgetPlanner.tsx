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

type BudgetStorage = {
  income: Income[];
  fixed: FixedOutgoing[];
  adhoc: Record<string, AdhocItem[]>; // keyed by "YYYY-MM"
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
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
function monthShort(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", {
    month: "short",
  });
}
// All months from January of current year through December next year
function planningMonths(): string[] {
  const now = new Date();
  const months: string[] = [];
  // Start from Jan this year, go to Dec next year
  for (let m = 0; m < 12; m++) {
    months.push(`${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`);
  }
  for (let m = 0; m < 12; m++) {
    months.push(`${now.getFullYear() + 1}-${String(m + 1).padStart(2, "0")}`);
  }
  return months;
}
function emptyStorage(): BudgetStorage {
  return { income: [], fixed: [], adhoc: {} };
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

// ── Small UI helpers ───────────────────────────────────────────────────────
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
  const storageKey = `pp-budget-v2-${person}`;
  const currentMonth = monthKey(new Date());
  const months = planningMonths();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [store, setStore] = useState<BudgetStorage>(emptyStorage);
  const [loaded, setLoaded] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setStore(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(store));
  }, [store, loaded, storageKey]);

  // Convenience accessors
  const adhocThisMonth: AdhocItem[] = store.adhoc[selectedMonth] ?? [];

  // ── Updaters ──

  function setIncome(income: Income[]) {
    setStore((s) => ({ ...s, income }));
  }
  function setFixed(fixed: FixedOutgoing[]) {
    setStore((s) => ({ ...s, fixed }));
  }
  function setAdhoc(items: AdhocItem[]) {
    setStore((s) => ({
      ...s,
      adhoc: { ...s.adhoc, [selectedMonth]: items },
    }));
  }

  // Income
  function addIncome() {
    setIncome([...store.income, { id: uid(), label: "", amount: "" }]);
  }
  function updateIncome(id: string, field: keyof Income, val: string) {
    setIncome(store.income.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  }
  function removeIncome(id: string) {
    setIncome(store.income.filter((i) => i.id !== id));
  }

  // Fixed
  function addFixed() {
    setFixed([
      ...store.fixed,
      { id: uid(), label: "", amount: "", bank: "", date: "", category: "" },
    ]);
  }
  function updateFixed(id: string, field: keyof FixedOutgoing, val: string) {
    setFixed(store.fixed.map((f) => (f.id === id ? { ...f, [field]: val } : f)));
  }
  function removeFixed(id: string) {
    setFixed(store.fixed.filter((f) => f.id !== id));
  }

  // Ad-hoc
  function addAdhoc() {
    setAdhoc([...adhocThisMonth, { id: uid(), label: "", amount: "" }]);
  }
  function updateAdhoc(id: string, field: keyof AdhocItem, val: string) {
    setAdhoc(adhocThisMonth.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  }
  function removeAdhoc(id: string) {
    setAdhoc(adhocThisMonth.filter((a) => a.id !== id));
  }

  // Totals
  const totalIncome = store.income.reduce((s, i) => s + parse(i.amount), 0);
  const totalFixed = store.fixed.reduce((s, f) => s + parse(f.amount), 0);
  const afterFixed = totalIncome - totalFixed;
  const totalAdhoc = adhocThisMonth.reduce((s, a) => s + parse(a.amount), 0);
  const totalOut = totalFixed + totalAdhoc;
  const remaining = totalIncome - totalOut;

  if (!loaded) return null;

  return (
    <div>
      {/* Month picker */}
      <div className="pp-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Select Month</p>
        {/* Group by year */}
        {[...new Set(months.map((m) => m.split("-")[0]))].map((year) => (
          <div key={year} className="mb-3 last:mb-0">
            <p className="text-xs text-slate-400 font-medium mb-2">{year}</p>
            <div className="flex flex-wrap gap-1.5">
              {months
                .filter((m) => m.startsWith(year))
                .map((m) => {
                  const isCurrent = m === currentMonth;
                  const isSelected = m === selectedMonth;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                        isSelected
                          ? "bg-slate-900 text-white shadow-sm"
                          : isCurrent
                          ? "text-slate-900 ring-2 ring-slate-900/20 hover:bg-slate-100"
                          : "text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {monthShort(m)}
                      {isCurrent && !isSelected && (
                        <span className="ml-1 text-[10px] text-teal-600 font-bold">●</span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Input columns ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Income */}
          <div className="pp-card p-5">
            <SectionHeader>💰 Income</SectionHeader>
            {store.income.length === 0 && (
              <p className="text-sm text-slate-400 mb-3">No income added yet.</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              {store.income.map((inc) => (
                <div key={inc.id} className="flex gap-2 items-center">
                  <TInput
                    value={inc.label}
                    onChange={(v) => updateIncome(inc.id, "label", v)}
                    placeholder="e.g. Salary, Freelance"
                    className="flex-1"
                  />
                  <TInput
                    value={inc.amount}
                    onChange={(v) => updateIncome(inc.id, "amount", v)}
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
            <button
              onClick={() => setFixedOpen((o) => !o)}
              className="w-full flex items-center justify-between mb-0 group"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 group-hover:text-slate-700 transition">
                📋 Fixed Monthly Outgoings
              </h2>
              <div className="flex items-center gap-3">
                {!fixedOpen && totalFixed > 0 && (
                  <span className="text-sm font-bold text-red-500 tabular-nums">{fmt(totalFixed)}</span>
                )}
                <span className="text-slate-400 group-hover:text-slate-600 transition text-xs font-semibold">
                  {fixedOpen ? "▲ collapse" : "▼ edit"}
                </span>
              </div>
            </button>

            {fixedOpen && (
              <div className="mt-3">
                {store.fixed.length === 0 && (
                  <p className="text-sm text-slate-400 mb-3">No fixed outgoings added yet.</p>
                )}
                <div className="flex flex-col gap-3 mb-3">
                  {store.fixed.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap gap-2 items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <TInput
                        value={f.label}
                        onChange={(v) => updateFixed(f.id, "label", v)}
                        placeholder="Description"
                        className="flex-1 min-w-32"
                      />
                      <TInput
                        value={f.amount}
                        onChange={(v) => updateFixed(f.id, "amount", v)}
                        placeholder="0.00"
                        type="number"
                        className="w-24"
                      />
                      <DeleteBtn onClick={() => removeFixed(f.id)} />
                      <TInput
                        value={f.bank}
                        onChange={(v) => updateFixed(f.id, "bank", v)}
                        placeholder="Bank / Card"
                        className="flex-1 min-w-28"
                      />
                      <TInput
                        value={f.date}
                        onChange={(v) => updateFixed(f.id, "date", v)}
                        placeholder="Day (e.g. 1st)"
                        className="w-28"
                      />
                      <select
                        value={f.category}
                        onChange={(e) => updateFixed(f.id, "category", e.target.value)}
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
            )}
          </div>

          {/* Ad-hoc — resets monthly */}
          <div className="pp-card p-5">
            <div className="flex items-start justify-between mb-1">
              <SectionHeader>📝 Ad-hoc This Month</SectionHeader>
              <span className="text-xs text-slate-400 rounded-lg px-2 py-1 bg-slate-100">
                {monthLabel(selectedMonth)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              One-offs, savings, birthday money — anything not fixed. Each month has its own list.
            </p>
            {adhocThisMonth.length === 0 && (
              <p className="text-sm text-slate-400 mb-3">Nothing added for {monthLabel(selectedMonth)} yet.</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              {adhocThisMonth.map((a) => (
                <div key={a.id} className="flex gap-2 items-center">
                  <TInput
                    value={a.label}
                    onChange={(v) => updateAdhoc(a.id, "label", v)}
                    placeholder="e.g. Birthday fund, Savings pot"
                    className="flex-1"
                  />
                  <TInput
                    value={a.amount}
                    onChange={(v) => updateAdhoc(a.id, "amount", v)}
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

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Income</p>
              {store.income.map((i) => (
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

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Fixed Outgoings</p>
              {store.fixed.map((f) => (
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

            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: "var(--pp-teal-soft)", border: "1px solid var(--pp-teal-border)" }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">After Fixed</span>
                <span className={`font-extrabold tabular-nums ${afterFixed >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmt(afterFixed)}
                </span>
              </div>
            </div>

            {adhocThisMonth.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Ad-hoc</p>
                {adhocThisMonth.map((a) => (
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
                <span className={`text-xl font-extrabold tabular-nums ${remaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmt(remaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
