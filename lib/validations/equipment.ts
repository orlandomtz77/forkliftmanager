import { z } from "zod";
import { EQUIPMENT_STATUSES } from "@/lib/domain/equipment";

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Ingresa ${label}.` })
    .trim()
    .min(1, { error: `Ingresa ${label}.` })
    .max(max, { error: `Máximo ${max} caracteres.` });

/** Empty form fields become null. */
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

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

/**
 * Search text is used inside a PostgREST `or` filter, so characters with
 * meaning in that syntax (commas, parentheses, wildcards, quotes) are removed.
 */
export function sanitizeSearch(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s\-./#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const equipmentFiltersSchema = z.object({
  q: z.preprocess(
    firstValue,
    z.string().optional().transform((v) => sanitizeSearch(v ?? "")),
  ),
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

export const idSchema = z.uuid({ error: "Identificador inválido." });
