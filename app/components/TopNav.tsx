"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Orders", href: "/orders" },
  { label: "Purchases", href: "/purchases" },
  { label: "Product Sales", href: "/products" },
  { label: "Finance", href: "/finance" },
  { label: "Recipes", href: "/recipes" },
  { label: "Materials", href: "/materials" },

  // ✅ NEW PAGE
  { label: "Seasonal Planner", href: "/seasonal" },
  { label: "Create Product", href: "/create-product" },
  { label: "Admin", href: "/admin" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--pp-teal)",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      <div className="pp-container py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Brand / Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/10 overflow-hidden">
              <img
                src="/paca-logo.png"
                alt="PacaPrints"
                width={40}
                height={40}
                style={{ display: "block" }}
              />
            </div>

            <div className="leading-tight">
              <div className="text-base font-extrabold text-slate-900">
                PacaPrints Ops
              </div>
              <div className="text-xs text-slate-700/80">
                inventory • orders • finance
              </div>
            </div>
          </Link>

          {/* Tabs (desktop) */}
          <nav className="hidden flex-wrap items-center justify-end gap-2 md:flex">
            {tabs.map((t) => {
              const active =
                pathname === t.href || pathname.startsWith(t.href + "/");
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/10"
                      : "text-slate-900/80 hover:bg-white/70 hover:text-slate-900",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}
            <Link
              href="/logout"
              prefetch={false}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900/60 hover:bg-white/70 hover:text-slate-900 transition"
            >
              Log out
            </Link>
          </nav>
        </div>

        {/* Tabs (mobile) */}
        <div className="mt-3 flex flex-wrap gap-2 md:hidden">
          {tabs.map((t) => {
            const active =
              pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/10"
                    : "text-slate-900/80 hover:bg-white/70 hover:text-slate-900",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
          <Link
            href="/logout"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900/60 hover:bg-white/70 hover:text-slate-900 transition"
          >
            Log out
          </Link>
        </div>
      </div>
    </header>
  );
}
