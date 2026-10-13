import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listActiveEquipmentOptions } from "@/lib/services/equipment";
import { listTechnicians } from "@/lib/services/profiles";
import { WorkOrderForm } from "@/components/work-orders/work-order-form";
import { createWorkOrderAction } from "../actions";
import { firstValue } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Reportar falla" };

export default async function NewWorkOrderPage(props: PageProps<"/work-orders/new">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const [equipment, technicians] = await Promise.all([
    listActiveEquipmentOptions(),
    isAdmin ? listTechnicians() : Promise.resolve([]),
  ]);

  // Optional preselection from the equipment detail page (?equipment=<id>).
  const requested = firstValue((await props.searchParams).equipment);
  const preselected = equipment.some((item) => item.id === requested)
    ? String(requested)
    : "";

  return (
    <section className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Reportar falla</h1>
      {equipment.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No hay equipos activos. <Link href="/equipment" className="underline">Revisa el catálogo</Link>.
        </p>
      ) : (
        <WorkOrderForm
          action={createWorkOrderAction}
          defaults={{
            equipment_id: preselected,
            title: "",
            description: "",
            priority: "medium",
            reported_at: "",
            target_date: "",
            failure_cause: "",
            assigned_technician_id: "",
          }}
          equipmentOptions={equipment.map((item) => ({
            value: item.id,
            label: `${item.asset_code} · ${item.brand} ${item.model}`,
          }))}
          technicianOptions={
            isAdmin
              ? technicians.map((t) => ({ value: t.id, label: t.full_name ?? "Sin nombre" }))
              : undefined
          }
          showGeneralFields
          showWorkFields={false}
          submitLabel="Crear orden"
          cancelHref="/work-orders"
        />
      )}
    </section>
  );
}
