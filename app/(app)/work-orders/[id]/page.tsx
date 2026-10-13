import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getStatusHistory, getWorkOrder } from "@/lib/services/work-orders";
import { idSchema } from "@/lib/validations/common";
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_TRANSITIONS,
  canUpdateWorkOrder,
  isOverdue,
  recordedCost,
  repairDuration,
} from "@/lib/domain/work-orders";
import { businessToday } from "@/lib/utils/business-time";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMoney,
} from "@/lib/utils/format";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/components/work-orders/badges";
import { EquipmentStatusBadge } from "@/components/equipment/status-badge";
import { StatusChangeForm } from "@/components/work-orders/status-change-form";
import { changeStatusAction } from "../actions";

export const metadata: Metadata = { title: "Orden de trabajo" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium whitespace-pre-line">{children}</dd>
    </div>
  );
}

export default async function WorkOrderDetailPage(props: PageProps<"/work-orders/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [workOrder, history] = await Promise.all([
    getWorkOrder(parsedId.data),
    getStatusHistory(parsedId.data),
  ]);
  if (!workOrder) notFound();

  const canEdit = canUpdateWorkOrder(user, workOrder);
  const duration = repairDuration(workOrder);
  const overdue = isOverdue(workOrder, businessToday());
  const allowedStatuses = WORK_ORDER_TRANSITIONS[workOrder.status].filter(
    (status) => status !== "assigned" || workOrder.assigned_technician_id !== null,
  );

  return (
    <section className="max-w-4xl space-y-6">
      <Link href="/work-orders" className="text-sm text-slate-600 hover:underline">
        ← Órdenes de trabajo
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">{workOrder.work_order_number}</p>
          <h1 className="text-2xl font-semibold">{workOrder.title}</h1>
          <div className="flex flex-wrap gap-1">
            <WorkOrderStatusBadge status={workOrder.status} />
            <PriorityBadge priority={workOrder.priority} />
            {overdue ? <OverdueBadge /> : null}
          </div>
        </div>
        {canEdit ? (
          <Link
            href={`/work-orders/${workOrder.id}/edit`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Equipo</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/equipment/${workOrder.equipment.id}`} className="font-medium underline">
            {workOrder.equipment.asset_code}
          </Link>
          <span className="text-slate-600">
            {workOrder.equipment.brand} {workOrder.equipment.model}
          </span>
          <EquipmentStatusBadge status={workOrder.equipment.operational_status} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          El estado operativo del equipo se actualiza manualmente en el catálogo.
        </p>
      </div>

      <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Reportada">{formatDateTime(workOrder.reported_at)}</Detail>
        <Detail label="Reportada por">{workOrder.creator?.full_name ?? "—"}</Detail>
        <Detail label="Técnico asignado">{workOrder.technician?.full_name ?? "Sin asignar"}</Detail>
        <Detail label="Fecha objetivo">{formatDate(workOrder.target_date)}</Detail>
        <Detail label="Inicio de reparación">{formatDateTime(workOrder.started_at)}</Detail>
        <Detail label="Resolución">{formatDateTime(workOrder.resolved_at)}</Detail>
        <Detail label="Duración de reparación">
          {duration
            ? `${formatDuration(duration.ms)}${duration.provisional ? " (provisional, en curso)" : ""}`
            : "—"}
        </Detail>
        <div className="sm:col-span-2 lg:col-span-3">
          <Detail label="Descripción">{workOrder.description ?? "—"}</Detail>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Detail label="Causa de la falla">{workOrder.failure_cause ?? "—"}</Detail>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Detail label="Notas de resolución">{workOrder.resolution_notes ?? "—"}</Detail>
        </div>
      </dl>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Costos registrados</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Detail label="Mano de obra">{formatMoney(workOrder.labor_cost)}</Detail>
          <Detail label="Refacciones">{formatMoney(workOrder.parts_cost)}</Detail>
          <Detail label="Costo registrado">
            {formatMoney(recordedCost(workOrder.labor_cost, workOrder.parts_cost))}
          </Detail>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          Suma de mano de obra y refacciones registradas; no incluye otros costos.
        </p>
      </div>

      {canEdit && allowedStatuses.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Cambiar estado</h2>
          <StatusChangeForm
            key={workOrder.status}
            action={changeStatusAction.bind(null, workOrder.id)}
            allowedStatuses={allowedStatuses}
          />
        </div>
      ) : null}
      {!canEdit && user.role === "technician" ? (
        <p className="text-sm text-slate-600">
          Solo el técnico asignado o un administrador pueden actualizar esta orden.
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-3 font-semibold">Historial de estados</h2>
        {history.length === 0 ? (
          <p className="text-slate-600">Sin cambios registrados.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
                <p className="font-medium">
                  {entry.previous_status
                    ? `${WORK_ORDER_STATUS_LABELS[entry.previous_status]} → ${WORK_ORDER_STATUS_LABELS[entry.new_status]}`
                    : `Creada como ${WORK_ORDER_STATUS_LABELS[entry.new_status]}`}
                </p>
                <p className="text-slate-600">
                  {formatDateTime(entry.changed_at)} · {entry.changed_by_profile?.full_name ?? "—"}
                </p>
                {entry.note ? <p className="mt-1 whitespace-pre-line">{entry.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
