import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getEquipment } from "@/lib/services/equipment";
import { idSchema } from "@/lib/validations/common";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { NoPermission } from "@/components/ui/no-permission";
import { updateEquipmentAction } from "../../actions";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditEquipmentPage(
  props: PageProps<"/equipment/[id]/edit">,
) {
  const user = await requireUser();
  const { id } = await props.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();

  if (user.role !== "admin") {
    return <NoPermission backHref={`/equipment/${parsedId.data}`} />;
  }

  const equipment = await getEquipment(parsedId.data);
  if (!equipment) notFound();

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        Editar equipo {equipment.asset_code}
      </h1>
      <EquipmentForm
        action={updateEquipmentAction.bind(null, equipment.id)}
        defaults={{
          asset_code: equipment.asset_code,
          serial_number: equipment.serial_number ?? "",
          brand: equipment.brand,
          model: equipment.model,
          hour_meter:
            equipment.hour_meter === null ? "" : String(equipment.hour_meter),
          operational_status: equipment.operational_status,
        }}
        submitLabel="Guardar cambios"
        cancelHref={`/equipment/${equipment.id}`}
      />
    </section>
  );
}
