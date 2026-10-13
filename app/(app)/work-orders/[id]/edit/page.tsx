import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/services/work-orders";
import { listTechnicians } from "@/lib/services/profiles";
import { idSchema } from "@/lib/validations/common";
import { canUpdateWorkOrder } from "@/lib/domain/work-orders";
import { toBusinessDateTimeInput } from "@/lib/utils/business-time";
import { WorkOrderForm } from "@/components/work-orders/work-order-form";
import { NoPermission } from "@/components/ui/no-permission";
import { updateWorkOrderAction } from "../../actions";

export const metadata: Metadata = { title: "Editar orden de trabajo" };

const toInput = (iso: string | null) => (iso ? toBusinessDateTimeInput(iso) : "");

export default async function EditWorkOrderPage(props: PageProps<"/work-orders/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const workOrder = await getWorkOrder(parsedId.data);
  if (!workOrder) notFound();
  if (!canUpdateWorkOrder(user, workOrder)) {
    return <NoPermission backHref={`/work-orders/${workOrder.id}`} />;
  }

  const isAdmin = user.role === "admin";
  const technicians = isAdmin ? await listTechnicians() : [];

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">{workOrder.work_order_number}</p>
        <h1 className="text-2xl font-semibold">Editar orden de trabajo</h1>
        <p className="text-sm text-slate-600">
          Equipo {workOrder.equipment.asset_code}. El estado se cambia desde el detalle de la orden.
        </p>
      </div>
      <WorkOrderForm
        action={updateWorkOrderAction.bind(null, workOrder.id)}
        defaults={{
          title: workOrder.title,
          description: workOrder.description ?? "",
          priority: workOrder.priority,
          reported_at: toInput(workOrder.reported_at),
          target_date: workOrder.target_date ?? "",
          assigned_technician_id: workOrder.assigned_technician_id ?? "",
          failure_cause: workOrder.failure_cause ?? "",
          resolution_notes: workOrder.resolution_notes ?? "",
          labor_cost: String(workOrder.labor_cost),
          parts_cost: String(workOrder.parts_cost),
          started_at: toInput(workOrder.started_at),
          resolved_at: toInput(workOrder.resolved_at),
        }}
        technicianOptions={
          isAdmin
            ? technicians.map((t) => ({ value: t.id, label: t.full_name ?? "Sin nombre" }))
            : undefined
        }
        showGeneralFields={isAdmin}
        showWorkFields
        showResolvedAt={workOrder.status === "resolved"}
        submitLabel="Guardar cambios"
        cancelHref={`/work-orders/${workOrder.id}`}
      />
    </section>
  );
}
