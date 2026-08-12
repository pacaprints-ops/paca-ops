import Link from "next/link";

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

const operationsTools: Tool[] = [
  {
    title: "Personalise",
    description: "Send personalisation requests to customers and track responses.",
    href: "/admin/personalisation",
    icon: "✉️",
  },
  {
    title: "Portrait Lookup",
    description: "Look up portrait orders and details.",
    href: "/portrait-lookup",
    icon: "🖼️",
  },
  {
    title: "Create Product",
    description: "Build and push a new product to Shopify.",
    href: "/create-product",
    icon: "➕",
  },
  {
    title: "Recipes",
    description: "Material recipes and cost breakdowns per product.",
    href: "/recipes",
    icon: "📋",
  },
  {
    title: "Materials",
    description: "Track material stock, costs and adjustments.",
    href: "/materials",
    icon: "📦",
  },
  {
    title: "Seasonal Planner",
    description: "Plan seasonal products and campaigns.",
    href: "/seasonal",
    icon: "📅",
  },
];

const pacaTools: Tool[] = [
  {
    title: "Reminders",
    description: "Things to come back to — tick off as you go.",
    href: "/admin/reminders",
    icon: "📌",
  },
  {
    title: "Platform Costs",
    description: "Track monthly platform fees. Toggle platforms off to see what you'd save.",
    href: "/admin/paca/platform-costs",
    icon: "💸",
  },
  {
    title: "Margin Calculator",
    description: "Profit and margin per platform with fees, sale prices, and reverse calculations.",
    href: "/admin/paca/margin-calculator",
    icon: "📊",
  },
];

const carrieTools: Tool[] = [
  {
    title: "Finances",
    description: "Income, fixed outgoings, and monthly budget.",
    href: "/admin/budget/carrie",
    icon: "💳",
  },
  {
    title: "Tax Calculator",
    description: "Rough self-assessment estimate based on PAYE, Paca share, and dividends.",
    href: "/admin/tax/carrie",
    icon: "🧾",
  },
  {
    title: "School Holiday Planner",
    description: "Plan activities and trips for school holidays.",
    href: "/admin/school-holidays/carrie",
    icon: "🎒",
  },
];

const vickyTools: Tool[] = [
  {
    title: "Finances",
    description: "Income, fixed outgoings, and monthly budget.",
    href: "/admin/budget/vicky",
    icon: "💳",
  },
  {
    title: "Tax Calculator",
    description: "Rough self-assessment estimate based on PAYE, Paca share, and extra cash income.",
    href: "/admin/tax/vicky",
    icon: "🧾",
  },
  {
    title: "School Holiday Planner",
    description: "Plan activities and trips for school holidays.",
    href: "/admin/school-holidays/vicky",
    icon: "🎒",
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="pp-card p-5 flex items-start gap-4 hover:shadow-md transition group"
    >
      <div className="text-2xl">{tool.icon}</div>
      <div>
        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition text-sm">
          {tool.title}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{tool.description}</div>
      </div>
    </Link>
  );
}

function Section({ title, tools }: { title: string; tools: Tool[] }) {
  return (
    <section>
      <h2 className="text-base font-extrabold text-slate-700 mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--pp-teal)" }} />
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.href} tool={t} />
        ))}
      </div>
    </section>
  );
}

export default function AdminPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Admin</h1>
      <p className="text-slate-500 text-sm mb-8">Internal tools — just for us.</p>

      <div className="flex flex-col gap-10">
        <Section title="Operations" tools={operationsTools} />
        <Section title="Paca" tools={pacaTools} />

        <section>
          <h2 className="text-base font-extrabold text-slate-700 mb-5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--pp-teal)" }} />
            Staff
          </h2>
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Carrie</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {carrieTools.map((t) => <ToolCard key={t.href} tool={t} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Vicky</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vickyTools.map((t) => <ToolCard key={t.href} tool={t} />)}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-slate-100">
        <Link href="/logout" prefetch={false} className="text-sm text-slate-400 hover:text-slate-600 transition">
          Log out
        </Link>
      </div>
    </main>
  );
}
