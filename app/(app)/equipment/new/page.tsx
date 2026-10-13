import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { NoPermission } from "@/components/ui/no-permission";
import { createEquipmentAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo equipo" };

export default async function NewEquipmentPage() {
  const user = await requireUser();
  if (user.role !== "admin") return <NoPermission backHref="/equipment" />;

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo equipo</h1>
      <EquipmentForm
        action={createEquipmentAction}
        defaults={{
          asset_code: "",
          serial_number: "",
          brand: "",
          model: "",
          hour_meter: "",
          operational_status: "available",
        }}
        submitLabel="Crear equipo"
        cancelHref="/equipment"
      />
    </section>
  );
}
