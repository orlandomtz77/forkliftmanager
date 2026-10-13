import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { APP_ROLE_LABELS } from "@/lib/domain/roles";
import type { CurrentUser } from "@/lib/auth/session";

const NAV_ITEMS = [{ href: "/dashboard", label: "Tablero" }] as const;

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            Forklift Service Manager
          </Link>
          <nav aria-label="Principal">
            <ul className="flex gap-4 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-slate-700 hover:text-slate-950 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-700">
            {user.fullName ?? user.email}{" "}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              {APP_ROLE_LABELS[user.role]}
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
