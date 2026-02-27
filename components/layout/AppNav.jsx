"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/recipes", label: "Recipes", icon: "🍳" },
  { href: "/food-log", label: "Food Log", icon: "🥗" },
  { href: "/explore", label: "Explore", icon: "🌎" },
  { href: "/settings", label: "Settings", icon: "⚙️" }
];

export default function AppNav() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAuthPage) return null;

  return (
    <header className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Recipe AI Planner</p>
          <p className="text-sm text-slate-500">Simple meal tracking and recipe management.</p>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          Personal Workspace
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href || (pathname?.startsWith(link.href) && link.href !== "/dashboard");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="mr-1.5">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
