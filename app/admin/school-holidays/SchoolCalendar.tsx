"use client";

import { useState, useEffect, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Carer = { id: string; name: string; color: string };
type PeriodType = "holiday" | "half_term" | "inset" | "digital_training" | "bank_holiday" | "other";
type Period = { id: string; label: string; type: PeriodType; start: string; end: string };
type CalendarStore = {
  children: string[];
  carers: Carer[];
  periods: Period[];
  care: Record<string, Record<string, string>>;  // YYYY-MM-DD -> childName -> carerId
  notes: Record<string, Record<string, string>>; // YYYY-MM-DD -> childName -> note
};

// ── Period type display ────────────────────────────────────────────────────
const PERIOD_STYLES: Record<PeriodType, { bg: string; text: string; border: string }> = {
  holiday:          { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  half_term:        { bg: "#CCFBF1", text: "#0F766E", border: "#99F6E4" },
  inset:            { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  digital_training: { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  bank_holiday:     { bg: "#FCE7F3", text: "#9D174D", border: "#FBCFE8" },
  other:            { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
};
const PERIOD_LABELS: Record<PeriodType, string> = {
  holiday: "School Holiday",
  half_term: "Half Term",
  inset: "INSET Day",
  digital_training: "Digital Training Day",
  bank_holiday: "Bank Holiday",
  other: "Other",
};

// ── Default data ───────────────────────────────────────────────────────────
function makeDefaults(person: string): CalendarStore {
  if (person === "carrie") {
    return {
      children: ["Olivia", "Max"],
      carers: [
        { id: "carrie", name: "Carrie", color: "#14B8A6" },
        { id: "nanny",  name: "Nanny",  color: "#F59E0B" },
        { id: "cm",     name: "Childminder", color: "#22C55E" },
      ],
      care: {},
      notes: {},
      periods: [
        // ── Bearwood 2025–26 ──────────────────────────────────────────
        { id: "b01", label: "INSET Day",         type: "inset",     start: "2025-09-03", end: "2025-09-03" },
        { id: "b02", label: "INSET Day",         type: "inset",     start: "2025-10-10", end: "2025-10-10" },
        { id: "b03", label: "Autumn Half Term",  type: "half_term", start: "2025-10-27", end: "2025-10-31" },
        { id: "b04", label: "INSET Day",         type: "inset",     start: "2025-11-03", end: "2025-11-03" },
        { id: "b05", label: "Christmas Holiday", type: "holiday",   start: "2025-12-20", end: "2026-01-04" },
        { id: "b06", label: "INSET Day",         type: "inset",     start: "2026-01-05", end: "2026-01-05" },
        { id: "b07", label: "Spring Half Term",  type: "half_term", start: "2026-02-16", end: "2026-02-20" },
        { id: "b08", label: "INSET Day",         type: "inset",     start: "2026-03-06", end: "2026-03-06" },
        { id: "b09", label: "Easter Holiday",    type: "holiday",   start: "2026-03-28", end: "2026-04-12" },
        { id: "b10", label: "Summer Half Term",  type: "half_term", start: "2026-05-25", end: "2026-05-29" },
        { id: "b11", label: "INSET Day",         type: "inset",     start: "2026-06-01", end: "2026-06-01" },
        { id: "b12", label: "Summer Holiday",    type: "holiday",   start: "2026-07-23", end: "2026-08-31" },
        // ── Bearwood 2026–27 ──────────────────────────────────────────
        { id: "b13", label: "INSET Day",         type: "inset",     start: "2026-09-01", end: "2026-09-01" },
        { id: "b14", label: "INSET Day",         type: "inset",     start: "2026-09-02", end: "2026-09-02" },
        { id: "b15", label: "Autumn Half Term",  type: "half_term", start: "2026-10-26", end: "2026-10-30" },
        { id: "b16", label: "Christmas Holiday", type: "holiday",   start: "2026-12-19", end: "2027-01-03" },
        { id: "b17", label: "INSET Day",         type: "inset",     start: "2027-01-04", end: "2027-01-04" },
        { id: "b18", label: "Spring Half Term",  type: "half_term", start: "2027-02-15", end: "2027-02-19" },
        { id: "b19", label: "INSET Day",         type: "inset",     start: "2027-03-25", end: "2027-03-25" },
        { id: "b20", label: "Easter Holiday",    type: "holiday",   start: "2027-03-26", end: "2027-04-11" },
        { id: "b21", label: "Summer Half Term",  type: "half_term", start: "2027-05-31", end: "2027-06-04" },
        { id: "b22", label: "INSET Day",         type: "inset",     start: "2027-06-07", end: "2027-06-07" },
        { id: "b23", label: "INSET Day",         type: "inset",     start: "2027-07-21", end: "2027-07-21" },
        { id: "b24", label: "Summer Holiday",    type: "holiday",   start: "2027-07-22", end: "2027-08-31" },
      ],
    };
  }
  // Vicky — Ferndown First School (Castleman Academy Trust)
  return {
    children: ["Thea", "Luca"],
    carers: [
      { id: "vicky", name: "Vicky", color: "#3B82F6" },
      { id: "scott", name: "Scott", color: "#8B5CF6" },
    ],
    care: {},
    periods: [
      // ── Fern First 2025–26 ────────────────────────────────────────
      { id: "f01", label: "Staff Training Day",  type: "inset",        start: "2025-09-01", end: "2025-09-01" },
      { id: "f02", label: "Staff Training Day",  type: "inset",        start: "2025-09-02", end: "2025-09-02" },
      { id: "f03", label: "Autumn Half Term",    type: "half_term",    start: "2025-10-27", end: "2025-10-31" },
      { id: "f04", label: "Christmas Holiday",   type: "holiday",      start: "2025-12-20", end: "2026-01-04" },
      { id: "f05", label: "Staff Training Day",  type: "inset",        start: "2026-01-05", end: "2026-01-05" },
      { id: "f06", label: "Spring Half Term",    type: "half_term",    start: "2026-02-16", end: "2026-02-20" },
      { id: "f07", label: "Easter Holiday",      type: "holiday",      start: "2026-03-30", end: "2026-04-10" },
      { id: "f08", label: "May Day",             type: "bank_holiday", start: "2026-05-04", end: "2026-05-04" },
      { id: "f09", label: "Summer Half Term",    type: "half_term",    start: "2026-05-25", end: "2026-05-29" },
      { id: "f10", label: "Staff Training Day",  type: "inset",        start: "2026-06-01", end: "2026-06-01" },
      { id: "f11", label: "Summer Holiday",      type: "holiday",      start: "2026-07-20", end: "2026-08-31" },
      // ── Fern First 2026–27 ────────────────────────────────────────
      { id: "f12", label: "Staff Training Day",  type: "inset",        start: "2026-09-01", end: "2026-09-01" },
      { id: "f13", label: "Staff Training Day",  type: "inset",        start: "2026-09-02", end: "2026-09-02" },
      { id: "f14", label: "Autumn Half Term",    type: "half_term",    start: "2026-10-26", end: "2026-10-30" },
      { id: "f15", label: "Christmas Holiday",   type: "holiday",      start: "2026-12-19", end: "2027-01-03" },
      { id: "f16", label: "Staff Training Day",  type: "inset",        start: "2027-01-04", end: "2027-01-04" },
      { id: "f17", label: "Spring Half Term",    type: "half_term",    start: "2027-02-15", end: "2027-02-19" },
      { id: "f18", label: "Staff Training Day",  type: "inset",        start: "2027-03-25", end: "2027-03-25" },
      { id: "f19", label: "Easter Holiday",      type: "holiday",      start: "2027-03-26", end: "2027-04-11" },
      { id: "f20", label: "May Day",             type: "bank_holiday", start: "2027-05-03", end: "2027-05-03" },
      { id: "f21", label: "Summer Half Term",    type: "half_term",    start: "2027-05-31", end: "2027-06-04" },
      { id: "f22", label: "Staff Training Day",  type: "inset",        start: "2027-06-07", end: "2027-06-07" },
      { id: "f23", label: "Summer Holiday",      type: "holiday",      start: "2027-07-24", end: "2027-08-31" },
    ],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }

function expandPeriod(p: Period): string[] {
  const out: string[] = [];
  const end = new Date(p.end + "T12:00:00");
  const cur = new Date(p.start + "T12:00:00");
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function isWeekend(d: string) {
  const day = new Date(d + "T12:00:00").getDay();
  return day === 0 || day === 6;
}

function dayLabel(d: string) {
  const dt = new Date(d + "T12:00:00");
  return {
    weekday: dt.toLocaleDateString("en-GB", { weekday: "short" }),
    date:    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  };
}

function toMonthKey(d: string) { return d.slice(0, 7); }

function monthDisplay(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
function monthShort(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("en-GB", { month: "short" });
}

// Fixed month range: Sep 2025 → Aug 2027
const ALL_MONTHS: string[] = [];
for (let y = 2025; y <= 2027; y++) {
  for (let m = 1; m <= 12; m++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key < "2025-09") continue;
    if (key > "2027-08") break;
    ALL_MONTHS.push(key);
  }
}

// ── Carer badge ────────────────────────────────────────────────────────────
function CarerBadge({ carer }: { carer: Carer }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold text-white shadow-sm"
      style={{ background: carer.color }}
    >
      {carer.name}
    </span>
  );
}

// ── Day row ────────────────────────────────────────────────────────────────
function DayRow({
  date,
  periodLabels,
  children,
  carers,
  assignments,
  notes,
  onChange,
  onNoteChange,
}: {
  date: string;
  periodLabels: { label: string; type: PeriodType }[];
  children: string[];
  carers: Carer[];
  assignments: Record<string, string>;
  notes: Record<string, string>;
  onChange: (child: string, carerId: string) => void;
  onNoteChange: (child: string, note: string) => void;
}) {
  const weekend = isWeekend(date);
  const { weekday, date: dateStr } = dayLabel(date);

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 border ${weekend ? "opacity-60 bg-slate-50 border-slate-100" : "bg-white border-slate-200"}`}>
      {/* Date */}
      <div className="w-24 shrink-0">
        <span className={`text-sm font-bold ${weekend ? "text-slate-400" : "text-slate-800"}`}>
          {weekday}
        </span>
        <span className="text-sm text-slate-500 ml-1.5">{dateStr}</span>
        {weekend && <span className="ml-2 text-xs text-slate-400 italic">weekend</span>}
      </div>

      {/* Period type badges */}
      <div className="flex flex-wrap gap-1 flex-1 min-w-40">
        {periodLabels.map((pl, i) => (
          <span
            key={i}
            className="text-xs font-semibold rounded-lg px-2 py-0.5"
            style={{
              background: PERIOD_STYLES[pl.type].bg,
              color: PERIOD_STYLES[pl.type].text,
              border: `1px solid ${PERIOD_STYLES[pl.type].border}`,
            }}
          >
            {pl.label}
          </span>
        ))}
      </div>

      {/* Child assignments */}
      {!weekend && (
        <div className="flex flex-wrap gap-3 ml-auto">
          {children.map((child) => {
            const carerId = assignments[child] ?? "";
            const carer = carers.find((c) => c.id === carerId);
            return (
              <div key={child} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium w-10 shrink-0">{child}</span>
                <div className="relative">
                  <select
                    value={carerId}
                    onChange={(e) => onChange(child, e.target.value)}
                    className="appearance-none rounded-lg border text-xs font-semibold pl-2 pr-6 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-300"
                    style={
                      carer
                        ? { background: carer.color, color: "#fff", borderColor: carer.color }
                        : { background: "#F8FAFC", color: "#94A3B8", borderColor: "#E2E8F0" }
                    }
                  >
                    <option value="">Not set</option>
                    {carers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px]"
                    style={{ color: carer ? "#fff" : "#94A3B8" }}>▼</span>
                </div>
                <input
                  type="text"
                  value={notes[child] ?? ""}
                  onChange={(e) => onNoteChange(child, e.target.value)}
                  placeholder="Notes…"
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-300 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 w-36"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Manage section ─────────────────────────────────────────────────────────
function ManageSection({
  store,
  onUpdate,
}: {
  store: CalendarStore;
  onUpdate: (s: CalendarStore) => void;
}) {
  const [open, setOpen] = useState(false);

  function addPeriod() {
    onUpdate({
      ...store,
      periods: [...store.periods, { id: uid(), label: "", type: "holiday", start: "", end: "" }],
    });
  }
  function updatePeriod(id: string, field: keyof Period, val: string) {
    onUpdate({
      ...store,
      periods: store.periods.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    });
  }
  function removePeriod(id: string) {
    onUpdate({ ...store, periods: store.periods.filter((p) => p.id !== id) });
  }

  function addCarer() {
    onUpdate({
      ...store,
      carers: [...store.carers, { id: uid(), name: "", color: "#94A3B8" }],
    });
  }
  function updateCarer(id: string, field: keyof Carer, val: string) {
    onUpdate({
      ...store,
      carers: store.carers.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    });
  }
  function removeCarer(id: string) {
    onUpdate({ ...store, carers: store.carers.filter((c) => c.id !== id) });
  }

  return (
    <div className="pp-card mt-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-2xl transition"
      >
        <span>⚙️ Manage Dates & Carers</span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 flex flex-col gap-8">
          {/* Carers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Carers</h3>
            <div className="flex flex-col gap-2 mb-3">
              {store.carers.map((c) => (
                <div key={c.id} className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => updateCarer(c.id, "color", e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateCarer(c.id, "name", e.target.value)}
                    placeholder="Carer name"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeCarer(c.id)}
                    className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                  >✕</button>
                </div>
              ))}
            </div>
            <button onClick={addCarer} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
              + Add Carer
            </button>
          </div>

          {/* Periods */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Non-School Periods</h3>
            <div className="flex flex-col gap-3 mb-3">
              {store.periods
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((p) => (
                  <div key={p.id} className="flex flex-wrap gap-2 items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => updatePeriod(p.id, "label", e.target.value)}
                      placeholder="e.g. Easter Holiday"
                      className="flex-1 min-w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => updatePeriod(p.id, "type", e.target.value as PeriodType)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none"
                    >
                      {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
                        <option key={t} value={t}>{PERIOD_LABELS[t]}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={p.start}
                      onChange={(e) => updatePeriod(p.id, "start", e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none"
                    />
                    <span className="text-slate-400 text-sm">→</span>
                    <input
                      type="date"
                      value={p.end}
                      onChange={(e) => updatePeriod(p.id, "end", e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-400 focus:outline-none"
                    />
                    <button
                      onClick={() => removePeriod(p.id)}
                      className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                    >✕</button>
                  </div>
                ))}
              {store.periods.length === 0 && (
                <p className="text-sm text-slate-400">No periods added. Add school holidays and INSET days here.</p>
              )}
            </div>
            <button onClick={addPeriod} className="pp-btn pp-btn-primary text-xs px-3 py-1.5">
              + Add Period
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SchoolCalendar({ person }: { person: string }) {
  const storageKey = `pp-school-cal-v1-${person}`;
  const currentMonth = toMonthKey(new Date().toISOString().slice(0, 10));

  const [store, setStore] = useState<CalendarStore>(() => makeDefaults(person));
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    ALL_MONTHS.includes(currentMonth) ? currentMonth : ALL_MONTHS[0]
  );

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

  // Build a map: date -> [{label, type}]
  const dateMap = useMemo(() => {
    const map: Record<string, { label: string; type: PeriodType }[]> = {};
    for (const period of store.periods) {
      if (!period.start || !period.end) continue;
      for (const date of expandPeriod(period)) {
        if (!map[date]) map[date] = [];
        map[date].push({ label: period.label || PERIOD_LABELS[period.type], type: period.type });
      }
    }
    return map;
  }, [store.periods]);

  // Days in selected month that are non-school days
  const daysInMonth = useMemo(() => {
    return Object.keys(dateMap)
      .filter((d) => toMonthKey(d) === selectedMonth)
      .sort();
  }, [dateMap, selectedMonth]);

  // Month tabs — highlight months with non-school days
  const monthsWithDays = useMemo(() => new Set(Object.keys(dateMap).map(toMonthKey)), [dateMap]);

  function setAssignment(date: string, child: string, carerId: string) {
    setStore((s) => ({
      ...s,
      care: { ...s.care, [date]: { ...(s.care[date] ?? {}), [child]: carerId } },
    }));
  }

  function setNote(date: string, child: string, note: string) {
    setStore((s) => ({
      ...s,
      notes: { ...s.notes, [date]: { ...(s.notes[date] ?? {}), [child]: note } },
    }));
  }

  if (!loaded) return null;

  // Group months by year for tabs
  const monthsByYear: Record<string, string[]> = {};
  for (const m of ALL_MONTHS) {
    const y = m.split("-")[0];
    if (!monthsByYear[y]) monthsByYear[y] = [];
    monthsByYear[y].push(m);
  }

  return (
    <div>
      {/* Carer legend */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-slate-500 font-semibold mr-1">Carers:</span>
        {store.carers.map((c) => (
          <CarerBadge key={c.id} carer={c} />
        ))}
      </div>

      {/* Month tabs */}
      <div className="pp-card p-4 mb-6">
        {Object.entries(monthsByYear).map(([year, months]) => (
          <div key={year} className="mb-3 last:mb-0">
            <p className="text-xs text-slate-400 font-semibold mb-2">{year}</p>
            <div className="flex flex-wrap gap-1.5">
              {months.map((m) => {
                const hasDay = monthsWithDays.has(m);
                const isCurrent = m === currentMonth;
                const isSelected = m === selectedMonth;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={[
                      "relative rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                      isSelected
                        ? "bg-slate-900 text-white shadow-sm"
                        : hasDay
                        ? "bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-teal-300"
                        : "text-slate-400 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {monthShort(m)}
                    {isCurrent && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400" />
                    )}
                    {hasDay && !isSelected && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Day list */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">{monthDisplay(selectedMonth)}</h2>
        <span className="text-xs text-slate-400">
          {daysInMonth.length} non-school day{daysInMonth.length !== 1 ? "s" : ""}
        </span>
      </div>

      {daysInMonth.length === 0 ? (
        <div className="pp-card p-8 text-center text-slate-400 text-sm">
          No non-school days in {monthDisplay(selectedMonth)}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {daysInMonth.map((date) => (
            <DayRow
              key={date}
              date={date}
              periodLabels={dateMap[date]}
              children={store.children}
              carers={store.carers}
              assignments={store.care[date] ?? {}}
              notes={store.notes?.[date] ?? {}}
              onChange={(child, carerId) => setAssignment(date, child, carerId)}
              onNoteChange={(child, note) => setNote(date, child, note)}
            />
          ))}
        </div>
      )}

      {/* Manage section */}
      <ManageSection store={store} onUpdate={setStore} />
    </div>
  );
}
