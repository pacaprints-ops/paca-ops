import Link from "next/link";
import SchoolCalendar from "../SchoolCalendar";

export default function VickySchoolCalendarPage() {
  return (
    <main className="pp-container py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800 transition">
          ← Admin
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-extrabold text-slate-900">Vicky — School Calendar</h1>
      </div>
      <SchoolCalendar person="vicky" />
    </main>
  );
}
