// app/seasonal/page.tsx
// Simple seasonal planner (UK) with “prep by” dates.
// Server component (no Supabase needed). Safe + won’t break anything.

type SeasonalEvent = {
  name: string;
  dateISO?: string; // exact date if known
  approxLabel?: string; // for things like “late July (varies)”
  leadDays: number; // how many days before to be “ready”
  notes?: string;
  tags?: string[];
};

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
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function SeasonalPage() {
  // Use “today” in user’s local time (browser). For server render, this is still fine for ordering.
  const today = new Date();
  const todayISO = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);

  // ✅ Edit this list whenever you want
  const events: SeasonalEvent[] = [
    {
      name: "Mother’s Day (UK)",
      dateISO: "2026-03-15",
      leadDays: 28,
      notes: "Aim for drafts live + shipping cutoffs in place.",
      tags: ["cards", "prints"],
    },
    {
      name: "Easter (Good Friday bank holiday)",
      dateISO: "2026-04-03",
      leadDays: 42,
      notes: "Treat as the start of Easter buying window.",
      tags: ["kids", "gifts"],
    },
    {
      name: "Easter Monday (bank holiday)",
      dateISO: "2026-04-06",
      leadDays: 42,
      tags: ["kids", "gifts"],
    },
    {
      name: "Father’s Day (UK)",
      dateISO: "2026-06-21",
      leadDays: 42,
      notes: "Start teasers earlier if you’re doing personalisation.",
      tags: ["cards", "prints"],
    },
    {
      name: "End of School Year / Teacher Gifts",
      approxLabel: "Late Jul (varies by area)",
      leadDays: 35,
      notes: "Term dates vary — keep stock ready and designs templated.",
      tags: ["teacher", "gifts"],
    },
    {
      name: "Back to School",
      approxLabel: "Early Sep (varies by area)",
      leadDays: 28,
      notes: "Good for lunchbox labels, name decals, planners, etc.",
      tags: ["vinyl", "labels"],
    },
    {
      name: "Halloween",
      dateISO: "2026-10-31",
      leadDays: 45,
      notes: "List early—people buy costumes/decor in Sept/Oct.",
      tags: ["seasonal"],
    },
    {
      name: "Bonfire Night (Guy Fawkes Night)",
      dateISO: "2026-11-05",
      leadDays: 21,
      tags: ["seasonal"],
    },
    {
      name: "Black Friday",
      dateISO: "2026-11-27",
      leadDays: 30,
      notes: "Plan bundles, promos, best-sellers, shipping messaging.",
      tags: ["promo"],
    },
    {
      name: "Cyber Monday",
      dateISO: "2026-11-30",
      leadDays: 30,
      tags: ["promo"],
    },
    {
      name: "Christmas Day",
      dateISO: "2026-12-25",
      leadDays: 60,
      notes: "Start Christmas listings much earlier (Oct).",
      tags: ["q4"],
    },
    {
      name: "Valentine’s Day",
      dateISO: "2027-02-14",
      leadDays: 45,
      notes: "Good to prep in Dec/Jan so you’re not scrambling.",
      tags: ["cards"],
    },
  ];

  // Only sort “dated” events; keep approx ones after (still visible)
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
          Upcoming key dates + when to be prepared (based on lead time). Today:{" "}
          <span className="font-semibold text-slate-800">{formatUKDate(todayISO)}</span>
        </p>
      </div>

      <div className="pp-card p-5">
        <div className="text-sm font-extrabold text-slate-900 mb-3">Dated events</div>

        <div className="-mx-5 overflow-x-auto px-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="min-w-[920px] w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-slate-50">
                <th className="px-3 py-2 font-semibold">Event</th>
                <th className="px-3 py-2 font-semibold">Holiday date</th>
                <th className="px-3 py-2 font-semibold">Lead time</th>
                <th className="px-3 py-2 font-semibold">Be ready by</th>
                <th className="px-3 py-2 font-semibold">Countdown</th>
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
                    <td className="px-3 py-2 whitespace-nowrap">{e.leadDays} days</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={prepPassed ? "text-red-700 font-semibold" : "text-slate-900"}>
                        {formatUKDate(e.prepISO)}
                      </span>
                      {prepPassed ? (
                        <span className="ml-2 text-xs font-semibold text-red-700">OVERDUE</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {holidayPassed ? "—" : `${e.untilHoliday} days`}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{e.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Tip: tweak <span className="font-semibold">leadDays</span> per event to match how early you like to prep.
        </p>
      </div>

      <div className="pp-card p-5">
        <div className="text-sm font-extrabold text-slate-900 mb-2">Variable date events (manual)</div>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
          {approx.map((e) => (
            <li key={e.name}>
              <span className="font-semibold text-slate-900">{e.name}:</span>{" "}
              {e.approxLabel ?? "—"} · be ready ~{e.leadDays} days before
              {e.notes ? <span className="text-slate-600"> — {e.notes}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}