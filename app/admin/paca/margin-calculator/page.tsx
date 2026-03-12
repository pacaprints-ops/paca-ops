import MarginCalculator from "./MarginCalculator";

export default function MarginCalculatorPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Margin Calculator</h1>
      <p className="text-slate-500 text-sm mb-8">
        Enter your COGS and sell price to see profit and margin per platform — including sale prices and reverse calculations.
      </p>
      <MarginCalculator />
    </main>
  );
}
