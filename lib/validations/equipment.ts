import { z } from "zod";
import { EQUIPMENT_STATUSES } from "@/lib/domain/equipment";
import {
  emptyToNull,
  firstValue,
  requiredText,
  searchParamSchema,
} from "@/lib/validations/common";

export const equipmentInputSchema = z.object({
  asset_code: requiredText("el código interno", 40),
  serial_number: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(60, { error: "Máximo 60 caracteres." })
      .nullable(),
  ),
  brand: requiredText("la marca", 60),
  model: requiredText("el modelo", 60),
  hour_meter: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "Ingresa un número válido." })
      .finite({ error: "Ingresa un número válido." })
      .min(0, { error: "El horómetro no puede ser negativo." })
      .max(999_999_999, { error: "El valor es demasiado grande." })
      .nullable(),
  ),
  operational_status: z.enum(EQUIPMENT_STATUSES, {
    error: "Selecciona un estado operativo válido.",
  }),
});

export type EquipmentInput = z.infer<typeof equipmentInputSchema>;

export const ACTIVE_FILTERS = ["active", "inactive", "all"] as const;
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];

export const equipmentFiltersSchema = z.object({
  q: searchParamSchema,
  status: z.preprocess(
    firstValue,
    z.enum(EQUIPMENT_STATUSES).optional().catch(undefined),
  ),
  active: z.preprocess(
    firstValue,
    z.enum(ACTIVE_FILTERS).optional().catch(undefined).transform((v) => v ?? "active"),
  ),
});

export type EquipmentFilters = z.infer<typeof equipmentFiltersSchema>;
