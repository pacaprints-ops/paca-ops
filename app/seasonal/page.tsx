// app/seasonal/page.tsx
// Seasonal planner (UK) with “prep by” dates + Ideas column.
// Events are sourced from ./events (single source of truth).

import { seasonalEvents, type SeasonalEvent } from "./events";

function formatUKDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export default function SeasonalPage() {
  const today = new Date();
  const todayISO = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);

  const events: SeasonalEvent[] = seasonalEvents;

  const dated = events
    .filter((e) => !!e.dateISO)
    .map((e) => {
      const prepISO = addDays(e.dateISO!, -e.leadDays);
      const untilHoliday = daysUntil(todayISO, e.dateISO!);
      const untilPrep = daysUntil(todayISO, prepISO);
      return { ...e, prepISO, untilHoliday, untilPrep };
    })
    .sort((a, b) => (a.dateISO! < b.dateISO! ? -1 : 1));

  const approx = events.filter((e) => !e.dateISO);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="pp-card p-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Seasonal Planner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upcoming key dates + when to be prepared. Today:{" "}
          <span className="font-semibold text-slate-800">{formatUKDate(todayISO)}</span>
        </p>
      </div>

      <div className="pp-card p-5">
        <div className="text-sm font-extrabold text-slate-900 mb-3">Dated events</div>

        <div className="-mx-5 overflow-x-auto px-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="min-w-[1050px] w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-slate-50">
                <th className="px-3 py-2 font-semibold">Event</th>
                <th className="px-3 py-2 font-semibold">Holiday date</th>
                <th className="px-3 py-2 font-semibold">Be ready by</th>
                <th className="px-3 py-2 font-semibold">Countdown</th>
                <th className="px-3 py-2 font-semibold">Ideas</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {dated.map((e) => {
                const prepPassed = e.untilPrep < 0;
                const holidayPassed = e.untilHoliday < 0;

                return (
                  <tr key={e.name} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-semibold text-slate-900">{e.name}</td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatUKDate(e.dateISO!)}
                      {holidayPassed ? (
                        <span className="ml-2 text-xs font-semibold text-slate-500">(passed)</span>
                      ) : null}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={prepPassed ? "text-red-700 font-semibold" : "text-slate-900"}>
                        {formatUKDate(e.prepISO)}
                      </span>
                      {prepPassed ? <span className="ml-2 text-xs font-semibold text-red-700">OVERDUE</span> : null}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">{holidayPassed ? "—" : `${e.untilHoliday} days`}</td>

                    <td className="px-3 py-2 text-slate-700">{e.ideas ?? "—"}</td>

                    <td className="px-3 py-2 text-slate-700">{e.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          The “Be ready by” date is calculated automatically. (Lead time is still used internally, just hidden.)
        </p>
      </div>

      <div className="pp-card p-5">
        <div className="text-sm font-extrabold text-slate-900 mb-2">Variable date events (manual)</div>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
          {approx.map((e) => (
            <li key={e.name}>
              <span className="font-semibold text-slate-900">{e.name}:</span> {e.approxLabel ?? "—"}
              {e.ideas ? (
                <div className="text-slate-700 mt-1">
                  <span className="font-semibold">Ideas:</span> {e.ideas}
                </div>
              ) : null}
              {e.notes ? (
                <div className="text-slate-600">
                  <span className="font-semibold">Notes:</span> {e.notes}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}