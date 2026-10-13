import type { Database } from "@/types/database";

export const EQUIPMENT_STATUSES = [
  "available",
  "rented",
  "in_maintenance",
  "out_of_service",
] as const satisfies readonly Database["public"]["Enums"]["equipment_status"][];

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: "Disponible",
  rented: "Rentado",
  in_maintenance: "En mantenimiento",
  out_of_service: "Fuera de servicio",
};

export type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
