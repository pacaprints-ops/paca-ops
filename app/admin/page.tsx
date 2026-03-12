import Link from "next/link";

const tools = [
  {
    title: "Carrie's Finances",
    description: "Income, fixed outgoings, and monthly budget.",
    href: "/admin/budget/carrie",
    icon: "💳",
  },
  {
    title: "Vicky's Finances",
    description: "Income, fixed outgoings, and monthly budget.",
    href: "/admin/budget/vicky",
    icon: "💳",
  },
];

export default function AdminPage() {
  return (
    <main className="pp-container py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Admin</h1>
      <p className="text-slate-500 text-sm mb-8">Internal tools — just for us.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="pp-card p-6 flex items-start gap-4 hover:shadow-md transition group"
          >
            <div className="text-3xl">{t.icon}</div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-teal-700 transition">
                {t.title}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{t.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
