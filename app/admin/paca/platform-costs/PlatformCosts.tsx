"use client";

import { useState, useEffect, useRef } from "react";
import { getOrMigrateUserData, setUserData } from "../../../lib/userStore";

type PaidBy = "Business" | "Carrie" | "Vicky" | "";

type Platform = {
  id: string;
  name: string;
  cost: string;
  active: boolean;
  paidBy: PaidBy;
};

function uid() {
  return Math.random().toString(36).slice(2);
}
function parse(v: string) {
  return parseFloat(v) || 0;
}
function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}

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

export default function PlatformCosts() {
  const storageKey = "pp-platform-costs-v1";
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getOrMigrateUserData<Platform[]>(storageKey).then((saved) => {
      if (saved) setPlatforms(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setUserData(storageKey, platforms), 600);
  }, [platforms, loaded]);

  function add() {
    setPlatforms((p) => [...p, { id: uid(), name: "", cost: "", active: true, paidBy: "" }]);
  }
  function update(id: string, field: keyof Platform, val: string | boolean) {
    setPlatforms((p) => p.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }
  function remove(id: string) {
    setPlatforms((p) => p.filter((x) => x.id !== id));
  }

  const totalAll = platforms.reduce((s, p) => s + parse(p.cost), 0);
  const totalActive = platforms.filter((p) => p.active).reduce((s, p) => s + parse(p.cost), 0);
  const saving = totalAll - totalActive;

  const byPayer = (["Business", "Carrie", "Vicky"] as const).map((payer) => ({
    payer,
    total: platforms.filter((p) => p.active && p.paidBy === payer).reduce((s, p) => s + parse(p.cost), 0),
  })).filter((x) => x.total > 0);

  if (!loaded) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Platform list */}
      <div className="lg:col-span-2">
        <div className="pp-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
            Monthly Platform Costs
          </h2>

          {platforms.length === 0 && (
            <p className="text-sm text-slate-400 mb-4">No platforms added yet.</p>
          )}

          <div className="flex flex-col gap-3 mb-4">
            {platforms.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  p.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                {/* Toggle */}
                <button
                  onClick={() => update(p.id, "active", !p.active)}
                  title={p.active ? "Disable" : "Enable"}
                  className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                    p.active ? "bg-teal-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      p.active ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <TInput
                  value={p.name}
                  onChange={(v) => update(p.id, "name", v)}
                  placeholder="Platform name (e.g. Etsy, TikTok)"
                  className="flex-1"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                  <input
                    type="number"
                    value={p.cost}
                    onChange={(e) => update(p.id, "cost", e.target.value)}
                    placeholder="0.00"
                    className="rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 w-28"
                  />
                </div>
                <select
                  value={p.paidBy}
                  onChange={(e) => update(p.id, "paidBy", e.target.value as PaidBy)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 w-28"
                >
                  <option value="">Paid by…</option>
                  <option value="Business">Business</option>
                  <option value="Carrie">Carrie</option>
                  <option value="Vicky">Vicky</option>
                </select>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-base leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button onClick={add} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
            + Add Platform
          </button>
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="pp-card-strong p-5 sticky top-24 flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Summary</h2>

          <div className="flex flex-col gap-2">
            {platforms.map((p) => (
              <div key={p.id} className={`flex justify-between text-sm gap-2 ${!p.active ? "line-through text-slate-400" : ""}`}>
                <span className="truncate max-w-32 text-slate-600">{p.name || "—"}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.paidBy && (
                    <span className="text-xs rounded-full px-2 py-0.5 bg-slate-100 text-slate-500">{p.paidBy}</span>
                  )}
                  <span className="tabular-nums text-slate-800">{fmt(parse(p.cost))}</span>
                </div>
              </div>
            ))}
          </div>

          {platforms.length > 0 && (
            <>
              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total (all)</span>
                  <span className="tabular-nums font-semibold text-slate-700">{fmt(totalAll)}</span>
                </div>
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-3"
                  style={{ background: "var(--pp-teal-soft)", border: "1px solid var(--pp-teal-border)" }}
                >
                  <span className="text-sm font-bold text-slate-700">Active total</span>
                  <span className="text-xl font-extrabold tabular-nums text-teal-700">{fmt(totalActive)}</span>
                </div>

                {saving > 0 && (
                  <div className="flex justify-between text-sm rounded-xl px-3 py-2 bg-emerald-50 border border-emerald-100">
                    <span className="text-emerald-700 font-medium">You&apos;d save</span>
                    <span className="tabular-nums font-bold text-emerald-600">{fmt(saving)}/mo</span>
                  </div>
                )}

                {byPayer.length > 0 && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">By payer</p>
                    {byPayer.map(({ payer, total }) => (
                      <div key={payer} className="flex justify-between text-sm">
                        <span className="text-slate-600">{payer}</span>
                        <span className="tabular-nums font-semibold text-slate-700">{fmt(total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Toggle platforms off to see what your total would look like without them.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
