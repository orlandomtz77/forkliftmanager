import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tablero" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Tablero operativo</h1>
      <p className="text-slate-600">
        Bienvenido, {user.fullName ?? user.email}.
      </p>
      <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Los indicadores se mostrarán cuando existan los módulos de equipos y
        órdenes de trabajo.
      </p>
    </section>
  );
}
