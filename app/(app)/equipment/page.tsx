import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listEquipment } from "@/lib/services/equipment";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
} from "@/lib/domain/equipment";
import { equipmentFiltersSchema } from "@/lib/validations/equipment";
import {
  ActiveBadge,
  EquipmentStatusBadge,
} from "@/components/equipment/status-badge";
import { formatHours } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Equipos" };

const controlClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

export default async function EquipmentListPage(
  props: PageProps<"/equipment">,
) {
  const user = await requireUser();
  const filters = equipmentFiltersSchema.parse(await props.searchParams);
  const equipment = await listEquipment(filters);
  const hasFilters = Boolean(filters.q || filters.status || filters.active !== "active");

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        {user.role === "admin" ? (
          <Link
            href="/equipment/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Nuevo equipo
          </Link>
        ) : null}
      </div>

      <form
        method="get"
        role="search"
        aria-label="Filtrar equipos"
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Código, serie, marca o modelo"
            defaultValue={filters.q}
            className={controlClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium">
            Estado operativo
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={controlClassName}
          >
            <option value="">Todos</option>
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EQUIPMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="active" className="block text-sm font-medium">
            Mostrar
          </label>
          <select
            id="active"
            name="active"
            defaultValue={filters.active}
            className={controlClassName}
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Filtrar
          </button>
          {hasFilters ? (
            <Link
              href="/equipment"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      {equipment.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          {hasFilters
            ? "Ningún equipo coincide con los filtros."
            : "Aún no hay equipos registrados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Listado de equipos</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Código</th>
                <th scope="col" className="px-4 py-2 font-medium">Marca / modelo</th>
                <th scope="col" className="px-4 py-2 font-medium">Serie</th>
                <th scope="col" className="px-4 py-2 font-medium">Horómetro</th>
                <th scope="col" className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/equipment/${item.id}`}
                      className="text-slate-900 underline-offset-2 hover:underline"
                    >
                      {item.asset_code}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {item.brand} {item.model}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {item.serial_number ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatHours(item.hour_meter)}
                  </td>
                  <td className="space-x-1 px-4 py-2">
                    <EquipmentStatusBadge status={item.operational_status} />
                    <ActiveBadge active={item.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
