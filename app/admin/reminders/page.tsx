import RemindersBoard from "./RemindersBoard";

export default function RemindersPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Reminders</h1>
      <p className="text-slate-500 text-sm mb-8">Things to come back to — tick off as you go.</p>
      <RemindersBoard />
    </main>
  );
}
