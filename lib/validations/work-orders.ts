import { z } from "zod";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
} from "@/lib/domain/work-orders";
import {
  dateStringSchema,
  emptyToNull,
  firstValue,
  idSchema,
  optionalText,
  requiredText,
  searchParamSchema,
} from "@/lib/validations/common";
import {
  parseBusinessDateTime,
  toBusinessDateTimeInput,
} from "@/lib/utils/business-time";

/** datetime-local value in business time → ISO instant. */
const businessDateTime = z
  .string({ error: "Ingresa una fecha y hora válidas." })
  .transform((value, ctx) => {
    const iso = parseBusinessDateTime(value);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: "Ingresa una fecha y hora válidas." });
      return z.NEVER;
    }
    return iso;
  });

const optionalBusinessDateTime = z.preprocess(
  emptyToNull,
  businessDateTime.nullable(),
);

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** Non-negative amount with cents; an empty field means 0. */
const money = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? 0 : value),
  z.coerce
    .number({ error: "Ingresa un monto válido." })
    .finite({ error: "Ingresa un monto válido." })
    .min(0, { error: "El costo no puede ser negativo." })
    .max(9_999_999_999.99, { error: "El monto es demasiado grande." })
    .refine(hasAtMostTwoDecimals, { error: "Usa máximo 2 decimales." }),
);

const priority = z.enum(WORK_ORDER_PRIORITIES, {
  error: "Selecciona una prioridad válida.",
});

const targetDate = z.preprocess(emptyToNull, dateStringSchema.nullable());

const technicianId = z.preprocess(
  emptyToNull,
  z.uuid({ error: "Selecciona un técnico válido." }).nullable(),
);

export const createWorkOrderSchema = z.object({
  equipment_id: z.uuid({ error: "Selecciona un equipo." }),
  title: requiredText("un título", 120),
  description: optionalText(2000),
  priority,
  reported_at: optionalBusinessDateTime,
  target_date: targetDate,
  failure_cause: optionalText(1000),
  assigned_technician_id: technicianId,
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

/** Fields only admins may change after creation. */
export const adminWorkOrderFieldsSchema = z.object({
  title: requiredText("un título", 120),
  description: optionalText(2000),
  priority,
  reported_at: businessDateTime,
  target_date: targetDate,
  assigned_technician_id: technicianId,
});

/** Fields admins and the assigned technician may change. */
export const workFieldsSchema = z.object({
  failure_cause: optionalText(1000),
  resolution_notes: optionalText(2000),
  labor_cost: money,
  parts_cost: money,
  started_at: optionalBusinessDateTime,
  resolved_at: optionalBusinessDateTime,
});

export type AdminWorkOrderFields = z.infer<typeof adminWorkOrderFieldsSchema>;
export type WorkFields = z.infer<typeof workFieldsSchema>;

export const changeStatusSchema = z.object({
  id: idSchema,
  status: z.enum(WORK_ORDER_STATUSES, { error: "Selecciona un estado válido." }),
  note: optionalText(500),
});

/** Allowed clock skew when checking that a timestamp is not in the future. */
const FUTURE_TOLERANCE_MS = 5 * 60_000;

/**
 * Cross-field timestamp rules (also enforced by database constraints):
 * no future report date; start and resolution not before the report;
 * resolution not before the start.
 */
export function validateWorkTimestamps(
  values: {
    reported_at: string;
    started_at: string | null;
    resolved_at: string | null;
  },
  now: Date = new Date(),
): Partial<Record<"reported_at" | "started_at" | "resolved_at", string>> {
  const errors: Partial<Record<"reported_at" | "started_at" | "resolved_at", string>> = {};
  const reported = new Date(values.reported_at).getTime();
  const started = values.started_at ? new Date(values.started_at).getTime() : null;
  const resolved = values.resolved_at ? new Date(values.resolved_at).getTime() : null;

  if (reported > now.getTime() + FUTURE_TOLERANCE_MS) {
    errors.reported_at = "La fecha de reporte no puede estar en el futuro.";
  }
  if (started !== null && started < reported) {
    errors.started_at = "El inicio no puede ser anterior al reporte.";
  }
  if (resolved !== null && resolved < reported) {
    errors.resolved_at = "La resolución no puede ser anterior al reporte.";
  } else if (resolved !== null && started !== null && resolved < started) {
    errors.resolved_at = "La resolución no puede ser anterior al inicio.";
  }
  return errors;
}

export const STATUS_FILTERS = ["open", "all", ...WORK_ORDER_STATUSES] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const workOrderFiltersSchema = z.object({
  q: searchParamSchema,
  equipment: z.preprocess(firstValue, z.uuid().optional().catch(undefined)),
  status: z.preprocess(
    firstValue,
    z
      .enum(STATUS_FILTERS)
      .optional()
      .catch(undefined)
      .transform((v): StatusFilter => v ?? "open"),
  ),
  priority: z.preprocess(firstValue, priority.optional().catch(undefined)),
  from: z.preprocess(firstValue, dateStringSchema.optional().catch(undefined)),
  to: z.preprocess(firstValue, dateStringSchema.optional().catch(undefined)),
  mine: z.preprocess(
    firstValue,
    z.enum(["1"]).optional().catch(undefined).transform((v) => v === "1"),
  ),
});

export type WorkOrderFilters = z.infer<typeof workOrderFiltersSchema>;

/**
 * datetime-local inputs only carry minutes. When the submitted value equals
 * the stored timestamp rounded to the minute, keep the stored value so an
 * untouched field does not lose its seconds (and break ordering checks).
 */
export function keepUnchangedTimestamp(
  submitted: string,
  parsed: string | null,
  stored: string | null,
): string | null {
  if (stored && submitted === toBusinessDateTimeInput(stored)) return stored;
  return parsed;
}
