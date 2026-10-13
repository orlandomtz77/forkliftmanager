import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getEquipment } from "@/lib/services/equipment";
import { idSchema } from "@/lib/validations/common";
import {
  ActiveBadge,
  EquipmentStatusBadge,
} from "@/components/equipment/status-badge";
import { ActiveToggle } from "@/components/equipment/active-toggle";
import { formatDateTime, formatHours } from "@/lib/utils/format";
import { listWorkOrders } from "@/lib/services/work-orders";
import { isOverdue } from "@/lib/domain/work-orders";
import { businessToday } from "@/lib/utils/business-time";
import {
  OverdueBadge,
  WorkOrderStatusBadge,
} from "@/components/work-orders/badges";

export const metadata: Metadata = { title: "Detalle de equipo" };

export default async function EquipmentDetailPage(
  props: PageProps<"/equipment/[id]">,
) {
  const user = await requireUser();
  const { id } = await props.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [equipment, workOrders] = await Promise.all([
    getEquipment(parsedId.data),
    listWorkOrders({ q: "", status: "all", equipment: parsedId.data, mine: false }),
  ]);
  if (!equipment) notFound();
  const today = businessToday();

  const isAdmin = user.role === "admin";

  return (
    <section className="max-w-3xl space-y-6">
      <Link href="/equipment" className="text-sm text-slate-600 hover:underline">
        ← Equipos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{equipment.asset_code}</h1>
          <p className="text-slate-600">
            {equipment.brand} {equipment.model}
          </p>
          <div className="space-x-1">
            <EquipmentStatusBadge status={equipment.operational_status} />
            <ActiveBadge active={equipment.is_active} />
          </div>
        </div>
        {isAdmin ? (
          <Link
            href={`/equipment/${equipment.id}/edit`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Número de serie</dt>
          <dd className="font-medium">{equipment.serial_number ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Horómetro</dt>
          <dd className="font-medium">{formatHours(equipment.hour_meter)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Registrado</dt>
          <dd className="font-medium">{formatDateTime(equipment.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Última actualización</dt>
          <dd className="font-medium">{formatDateTime(equipment.updated_at)}</dd>
        </div>
      </dl>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Órdenes de trabajo</h2>
          {equipment.is_active ? (
            <Link
              href={`/work-orders/new?equipment=${equipment.id}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Reportar falla
            </Link>
          ) : null}
        </div>
        {workOrders.length === 0 ? (
          <p className="text-slate-600">Este equipo no tiene órdenes registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {workOrders.map((wo) => (
              <li key={wo.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                  <span className="font-medium">{wo.work_order_number}</span> · {wo.title}
                </Link>
                <span className="flex gap-1">
                  <WorkOrderStatusBadge status={wo.status} />
                  {isOverdue(wo, today) ? <OverdueBadge /> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <ActiveToggle equipmentId={equipment.id} isActive={equipment.is_active} />
      ) : null}
    </section>
  );
}
