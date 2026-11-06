import PlatformCosts from "./PlatformCosts";

export default function PlatformCostsPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Business Costs</h1>
      <p className="text-slate-500 text-sm mb-8">
        What the business pays out each month that isn&apos;t tied to an order — subscriptions, platform plans, ads, equipment. Comes straight from Expenses.
      </p>
      <PlatformCosts />
    </main>
  );
}
