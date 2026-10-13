import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listWorkOrders } from "@/lib/services/work-orders";
import { listActiveEquipmentOptions } from "@/lib/services/equipment";
import { workOrderFiltersSchema } from "@/lib/validations/work-orders";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  isOverdue,
} from "@/lib/domain/work-orders";
import { businessToday } from "@/lib/utils/business-time";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { inputClassName } from "@/components/ui/form-field";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/components/work-orders/badges";

export const metadata: Metadata = { title: "Órdenes de trabajo" };

export default async function WorkOrdersPage(props: PageProps<"/work-orders">) {
  const user = await requireUser();
  const filters = workOrderFiltersSchema.parse(await props.searchParams);
  const [workOrders, equipmentOptions] = await Promise.all([
    listWorkOrders({ ...filters, assignedTo: filters.mine ? user.id : undefined }),
    listActiveEquipmentOptions(),
  ]);
  const today = businessToday();
  const hasFilters = Boolean(
    filters.q ||
      filters.equipment ||
      filters.priority ||
      filters.from ||
      filters.to ||
      filters.mine ||
      filters.status !== "open",
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Órdenes de trabajo</h1>
        <Link
          href="/work-orders/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Reportar falla
        </Link>
      </div>

      <form
        method="get"
        role="search"
        aria-label="Filtrar órdenes de trabajo"
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="space-y-1">
          <label htmlFor="q" className="block text-sm font-medium">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Número o título"
            defaultValue={filters.q}
            className={inputClassName}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium">Estado</label>
          <select id="status" name="status" defaultValue={filters.status} className={inputClassName}>
            <option value="open">Abiertas</option>
            <option value="all">Todas</option>
            {WORK_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {WORK_ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="priority" className="block text-sm font-medium">Prioridad</label>
          <select id="priority" name="priority" defaultValue={filters.priority ?? ""} className={inputClassName}>
            <option value="">Todas</option>
            {WORK_ORDER_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {WORK_ORDER_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="equipment" className="block text-sm font-medium">Equipo</label>
          <select id="equipment" name="equipment" defaultValue={filters.equipment ?? ""} className={inputClassName}>
            <option value="">Todos</option>
            {equipmentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.asset_code} · {item.brand} {item.model}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="from" className="block text-sm font-medium">Reportada desde</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClassName} />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="block text-sm font-medium">Reportada hasta</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClassName} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="mine" value="1" defaultChecked={filters.mine} className="size-4" />
            Solo asignadas a mí
          </label>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Filtrar
          </button>
          {hasFilters ? (
            <Link
              href="/work-orders"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      {workOrders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          {hasFilters
            ? "Ninguna orden coincide con los filtros."
            : "No hay órdenes de trabajo abiertas."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Listado de órdenes de trabajo</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Orden</th>
                <th scope="col" className="px-4 py-2 font-medium">Equipo</th>
                <th scope="col" className="px-4 py-2 font-medium">Estado</th>
                <th scope="col" className="px-4 py-2 font-medium">Técnico</th>
                <th scope="col" className="px-4 py-2 font-medium">Reportada</th>
                <th scope="col" className="px-4 py-2 font-medium">Objetivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {wo.work_order_number}
                    </Link>
                    <div className="text-slate-700">{wo.title}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{wo.equipment.asset_code}</td>
                  <td className="space-y-1 px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      <WorkOrderStatusBadge status={wo.status} />
                      {isOverdue(wo, today) ? <OverdueBadge /> : null}
                    </div>
                    <PriorityBadge priority={wo.priority} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {wo.technician?.full_name ?? "Sin asignar"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                    {formatDateTime(wo.reported_at)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                    {formatDate(wo.target_date)}
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
