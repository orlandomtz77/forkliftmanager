import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { computeWorkOrderKpis, overdueWorkOrders } from "@/lib/domain/kpis";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/lib/domain/work-orders";
import {
  dashboardFiltersSchema,
  type DashboardFilters,
} from "@/lib/validations/dashboard";
import {
  getEquipmentCounts,
  listWorkOrdersForKpis,
} from "@/lib/services/dashboard";
import { listActiveEquipmentOptions } from "@/lib/services/equipment";
import { businessToday } from "@/lib/utils/business-time";
import { formatDate, formatDuration, formatMoney } from "@/lib/utils/format";
import { inputClassName } from "@/components/ui/form-field";
import { WorkOrderStatusBadge } from "@/components/work-orders/badges";

export const metadata: Metadata = { title: "Tablero" };

const OVERDUE_LIST_LIMIT = 10;

/** Link to the work-order list with the dashboard filters applied. */
function workOrdersHref(
  filters: DashboardFilters,
  status: WorkOrderStatus | "open" | "all" = filters.status,
): string {
  const params = new URLSearchParams({ status });
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return `/work-orders?${params}`;
}

function KpiCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
}) {
  const body = (
    <>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-slate-500">{detail}</dd> : null}
    </>
  );
  const className = "block rounded-lg border border-slate-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${className} hover:border-slate-400`}>
      <dl>{body}</dl>
    </Link>
  ) : (
    <dl className={className}>{body}</dl>
  );
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const filters = dashboardFiltersSchema.parse(await props.searchParams);
  const [equipmentCounts, { rows, truncated }, equipmentOptions] = await Promise.all([
    getEquipmentCounts(),
    listWorkOrdersForKpis(filters),
    listActiveEquipmentOptions(),
  ]);
  const today = businessToday();
  const kpis = computeWorkOrderKpis(rows, today);
  const overdue = overdueWorkOrders(rows, today);
  const hasFilters = Boolean(
    filters.equipment || filters.priority || filters.from || filters.to || filters.status !== "all",
  );

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Tablero operativo</h1>
        <p className="text-slate-600">Bienvenido, {user.fullName ?? user.email}.</p>
      </div>

      <section aria-labelledby="fleet-heading" className="space-y-3">
        <div>
          <h2 id="fleet-heading" className="text-lg font-semibold">Flota</h2>
          <p className="text-xs text-slate-500">
            Estado actual de los equipos activos; no depende de los filtros.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Equipos activos" value={equipmentCounts.active} href="/equipment" />
          <KpiCard
            label="Fuera de servicio"
            value={equipmentCounts.outOfService}
            href="/equipment?status=out_of_service"
          />
          <KpiCard
            label="En mantenimiento"
            value={equipmentCounts.inMaintenance}
            href="/equipment?status=in_maintenance"
          />
        </div>
      </section>

      <section aria-labelledby="orders-heading" className="space-y-3">
        <h2 id="orders-heading" className="text-lg font-semibold">Órdenes de trabajo</h2>

        <form
          method="get"
          aria-label="Filtrar indicadores"
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-1">
            <label htmlFor="from" className="block text-sm font-medium">Reportadas desde</label>
            <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClassName} />
          </div>
          <div className="space-y-1">
            <label htmlFor="to" className="block text-sm font-medium">Reportadas hasta</label>
            <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClassName} />
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
            <label htmlFor="status" className="block text-sm font-medium">Estado</label>
            <select id="status" name="status" defaultValue={filters.status} className={inputClassName}>
              <option value="all">Todos</option>
              <option value="open">Abiertas</option>
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
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Aplicar filtros
            </button>
            {hasFilters ? (
              <Link
                href="/dashboard"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>

        {truncated ? (
          <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Hay demasiadas órdenes para el periodo elegido; los indicadores solo
            consideran una parte. Acota el rango de fechas.
          </p>
        ) : null}

        {kpis.total === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {hasFilters
              ? "Ninguna orden de trabajo coincide con los filtros."
              : "Todavía no hay órdenes de trabajo registradas."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Órdenes" value={kpis.total} href={workOrdersHref(filters)} />
              <KpiCard
                label="Abiertas"
                value={kpis.open}
                detail="Distintas de Resuelta y Cancelada"
                href={workOrdersHref(filters, "open")}
              />
              <KpiCard
                label="Vencidas"
                value={kpis.overdue}
                detail="Abiertas con fecha objetivo anterior a hoy"
              />
              <KpiCard label="Cerradas" value={kpis.closed} detail="Resueltas o canceladas" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <h3 className="mb-3 font-semibold">Por estado</h3>
                <ul className="space-y-2">
                  {WORK_ORDER_STATUSES.map((status) => (
                    <li key={status} className="flex items-center justify-between gap-2">
                      <Link href={workOrdersHref(filters, status)} className="hover:underline">
                        <WorkOrderStatusBadge status={status} />
                      </Link>
                      <span className="font-medium tabular-nums">{kpis.byStatus[status]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <h3 className="mb-3 font-semibold">Duración de reparación</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-slate-600">Promedio (resueltas)</dt>
                    <dd className="text-xl font-semibold">
                      {kpis.repair.averageMs === null ? "Sin datos" : formatDuration(kpis.repair.averageMs)}
                    </dd>
                    <dd className="text-xs text-slate-500">
                      {kpis.repair.completedCount} órdenes con inicio y resolución
                      {kpis.repair.maxMs === null ? "" : ` · máxima ${formatDuration(kpis.repair.maxMs)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">En curso (provisional)</dt>
                    <dd className="text-xl font-semibold">
                      {kpis.repair.averageProvisionalMs === null
                        ? "Sin datos"
                        : formatDuration(kpis.repair.averageProvisionalMs)}
                    </dd>
                    <dd className="text-xs text-slate-500">
                      Tiempo promedio desde el inicio de {kpis.repair.inProgressCount} órdenes abiertas
                    </dd>
                  </div>
                </dl>
                {kpis.repair.missingDataCount > 0 ? (
                  <p className="mt-3 text-xs text-amber-800">
                    {kpis.repair.missingDataCount} resueltas sin fecha de inicio no se incluyen.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <h3 className="mb-3 font-semibold">Costo registrado</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="sr-only">Costo registrado</dt>
                    <dd className="text-xl font-semibold">{formatMoney(kpis.cost.recorded)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Mano de obra</dt>
                    <dd className="tabular-nums">{formatMoney(kpis.cost.labor)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Refacciones</dt>
                    <dd className="tabular-nums">{formatMoney(kpis.cost.parts)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                  Suma de mano de obra y refacciones registradas en las órdenes
                  filtradas (incluye canceladas). No es el costo total del negocio.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <h3 className="mb-3 font-semibold">Órdenes vencidas</h3>
              {overdue.length === 0 ? (
                <p className="text-slate-600">No hay órdenes vencidas.</p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100">
                    {overdue.slice(0, OVERDUE_LIST_LIMIT).map((wo) => (
                      <li key={wo.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <Link href={`/work-orders/${wo.id}`} className="font-medium hover:underline">
                            {wo.work_order_number}
                          </Link>{" "}
                          <span className="text-slate-700">{wo.title}</span>
                          <div className="text-xs text-slate-500">
                            {wo.equipment.asset_code} · objetivo {formatDate(wo.target_date)}
                          </div>
                        </div>
                        <WorkOrderStatusBadge status={wo.status} />
                      </li>
                    ))}
                  </ul>
                  {overdue.length > OVERDUE_LIST_LIMIT ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Se muestran {OVERDUE_LIST_LIMIT} de {overdue.length}, las de fecha objetivo más antigua.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
