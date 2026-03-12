import PlatformCosts from "./PlatformCosts";

export default function PlatformCostsPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Platform Costs</h1>
      <p className="text-slate-500 text-sm mb-8">
        Track monthly platform fees. Toggle platforms off to see what you&apos;d save.
      </p>
      <PlatformCosts />
    </main>
  );
}
