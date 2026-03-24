import Link from "next/link";

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

const sharedTools: Tool[] = [
  {
    title: "Reminders",
    description: "Things to come back to — tick off as you go.",
    href: "/admin/reminders",
    icon: "📌",
  },
];

const pacaTools: Tool[] = [
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

function PersonSection({ name, tools }: { name: string; tools: Tool[] }) {
  return (
    <section>
      <h2 className="text-base font-extrabold text-slate-700 mb-3 flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "var(--pp-teal)" }}
        />
        {name}
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
        <PersonSection name="Shared" tools={sharedTools} />
        <PersonSection name="Paca" tools={pacaTools} />
        <PersonSection name="Carrie" tools={carrieTools} />
        <PersonSection name="Vicky" tools={vickyTools} />
      </div>

      <div className="mt-12 pt-6 border-t border-slate-100">
        <Link
          href="/logout"
          prefetch={false}
          className="text-sm text-slate-400 hover:text-slate-600 transition"
        >
          Log out
        </Link>
      </div>
    </main>
  );
}
