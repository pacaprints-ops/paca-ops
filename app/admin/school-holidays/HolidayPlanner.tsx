"use client";

import { useState, useEffect, useRef } from "react";
import { getOrMigrateUserData, setUserData } from "../../lib/userStore";

// ── Types ──────────────────────────────────────────────────────────────────
type Activity = { id: string; label: string; notes: string; cost: string; done: boolean };
type HolidayPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2);
}
function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}
function parse(v: string) {
  return parseFloat(v) || 0;
}
function formatDate(d: string) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(startDate: string) {
  if (!startDate) return null;
  const diff = Math.ceil((new Date(startDate).getTime() - Date.now()) / 86400000);
  return diff;
}

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
      className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-sm leading-none"
      title="Remove"
    >
      ✕
    </button>
  );
}

// ── Activity row ───────────────────────────────────────────────────────────
function ActivityRow({
  activity,
  onChange,
  onRemove,
}: {
  activity: Activity;
  onChange: (field: keyof Activity, val: string | boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${activity.done ? "opacity-60 bg-slate-50" : "bg-white border-slate-200"}`}>
      <div className="flex gap-2 items-center">
        <input
          type="checkbox"
          checked={activity.done}
          onChange={(e) => onChange("done", e.target.checked)}
          className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
        />
        <TInput
          value={activity.label}
          onChange={(v) => onChange("label", v)}
          placeholder="Activity / plan"
          className={`flex-1 ${activity.done ? "line-through text-slate-400" : ""}`}
        />
        <TInput
          value={activity.cost}
          onChange={(v) => onChange("cost", v)}
          placeholder="Cost £"
          type="number"
          className="w-24"
        />
        <DeleteBtn onClick={onRemove} />
      </div>
      <TInput
        value={activity.notes}
        onChange={(v) => onChange("notes", v)}
        placeholder="Notes (optional)"
        className="w-full text-xs"
      />
    </div>
  );
}

// ── Holiday card ───────────────────────────────────────────────────────────
function HolidayCard({
  period,
  onChange,
  onRemove,
}: {
  period: HolidayPeriod;
  onChange: (updated: HolidayPeriod) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  const totalCost = period.activities.reduce((s, a) => s + parse(a.cost), 0);
  const doneCost = period.activities
    .filter((a) => a.done)
    .reduce((s, a) => s + parse(a.cost), 0);
  const days = daysUntil(period.startDate);
  const isPast = days !== null && days < 0;

  function updateActivity(id: string, field: keyof Activity, val: string | boolean) {
    onChange({
      ...period,
      activities: period.activities.map((a) =>
        a.id === id ? { ...a, [field]: val } : a
      ),
    });
  }
  function addActivity() {
    onChange({
      ...period,
      activities: [
        ...period.activities,
        { id: uid(), label: "", notes: "", cost: "", done: false },
      ],
    });
  }
  function removeActivity(id: string) {
    onChange({ ...period, activities: period.activities.filter((a) => a.id !== id) });
  }

  return (
    <div className="pp-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        style={{ background: isPast ? "rgba(0,0,0,0.02)" : "var(--pp-teal-soft)" }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Editable name */}
          <input
            type="text"
            value={period.name}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ ...period, name: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Holiday name"
            className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-400 focus:outline-none text-base w-40"
          />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <input
              type="date"
              value={period.startDate}
              onChange={(e) => { e.stopPropagation(); onChange({ ...period, startDate: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-teal-400 focus:outline-none"
            />
            <span>→</span>
            <input
              type="date"
              value={period.endDate}
              onChange={(e) => { e.stopPropagation(); onChange({ ...period, endDate: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-teal-400 focus:outline-none"
            />
          </div>
          {/* Countdown */}
          {days !== null && (
            <span className={`text-xs font-semibold rounded-lg px-2 py-0.5 ${
              isPast
                ? "bg-slate-100 text-slate-400"
                : days <= 14
                ? "bg-orange-100 text-orange-600"
                : "bg-teal-100 text-teal-700"
            }`}>
              {isPast ? "Past" : days === 0 ? "Today!" : `${days}d away`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalCost > 0 && (
            <span className="text-sm font-bold text-slate-700 tabular-nums">
              {fmt(totalCost)}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {period.activities.length} item{period.activities.length !== 1 ? "s" : ""}
          </span>
          <DeleteBtn onClick={(e?: unknown) => { if (e && (e as React.MouseEvent).stopPropagation) (e as React.MouseEvent).stopPropagation(); onRemove(); }} />
          <span className="text-slate-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="p-4 border-t border-slate-100">
          {period.activities.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">No activities planned yet.</p>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {period.activities.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                onChange={(field, val) => updateActivity(a.id, field, val)}
                onRemove={() => removeActivity(a.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={addActivity} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
              + Add Activity
            </button>
            {totalCost > 0 && (
              <div className="text-sm text-slate-600 text-right">
                <span className="text-slate-400">Spent: </span>
                <span className="font-bold text-emerald-600 tabular-nums">{fmt(doneCost)}</span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="font-bold text-slate-800 tabular-nums">{fmt(totalCost)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function HolidayPlanner({ person }: { person: string }) {
  const storageKey = `pp-holidays-v1-${person}`;
  const [periods, setPeriods] = useState<HolidayPeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getOrMigrateUserData<HolidayPeriod[]>(storageKey).then((saved) => {
      if (saved) setPeriods(saved);
      setLoaded(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setUserData(storageKey, periods), 600);
  }, [periods, loaded, storageKey]);

  function addPeriod() {
    setPeriods((p) => [
      ...p,
      { id: uid(), name: "", startDate: "", endDate: "", activities: [] },
    ]);
  }
  function updatePeriod(updated: HolidayPeriod) {
    setPeriods((p) => p.map((h) => (h.id === updated.id ? updated : h)));
  }
  function removePeriod(id: string) {
    setPeriods((p) => p.filter((h) => h.id !== id));
  }

  // Sort: upcoming first, then past
  const sorted = [...periods].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const totalBudget = periods.reduce(
    (s, p) => s + p.activities.reduce((ss, a) => ss + parse(a.cost), 0),
    0
  );

  if (!loaded) return null;

  return (
    <div>
      {/* Summary bar */}
      {periods.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6 pp-card p-4">
          <div className="text-sm">
            <span className="text-slate-500">Holiday periods: </span>
            <span className="font-bold text-slate-900">{periods.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-500">Total planned spend: </span>
            <span className="font-bold text-slate-900 tabular-nums">{fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {/* Holiday cards */}
      <div className="flex flex-col gap-4 mb-6">
        {sorted.length === 0 && (
          <p className="text-slate-400 text-sm">No holiday periods added yet. Add one below to start planning.</p>
        )}
        {sorted.map((period) => (
          <HolidayCard
            key={period.id}
            period={period}
            onChange={updatePeriod}
            onRemove={() => removePeriod(period.id)}
          />
        ))}
      </div>

      <button onClick={addPeriod} className="pp-btn pp-btn-primary">
        + Add Holiday Period
      </button>
    </div>
  );
}
