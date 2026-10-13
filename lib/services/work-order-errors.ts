import {
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  type DbError,
  type ServiceResult,
} from "@/lib/services/db-errors";

// Maps database errors raised by work order triggers and constraints to
// user-facing messages (and the form field they belong to, when known).

type MappedError = { field?: string; message: string };

const RAISED_ERRORS: Record<string, MappedError> = {
  equipment_not_available: {
    field: "equipment_id",
    message: "El equipo no existe o está inactivo.",
  },
  assignment_not_allowed: {
    field: "assigned_technician_id",
    message: "Solo un administrador puede asignar técnicos.",
  },
  invalid_technician: {
    field: "assigned_technician_id",
    message: "Selecciona un técnico activo.",
  },
  reported_at_in_future: {
    field: "reported_at",
    message: "La fecha de reporte no puede estar en el futuro.",
  },
  immutable_field: { message: "Ese dato no se puede modificar." },
  field_not_allowed: { message: "No tienes permiso para modificar ese dato." },
  invalid_status_transition: { message: "Ese cambio de estado no está permitido." },
  work_order_not_found: { message: "Orden no encontrada o sin permiso para modificarla." },
  note_too_long: { field: "note", message: "Máximo 500 caracteres." },
};

const CHECK_CONSTRAINTS: Record<string, MappedError> = {
  work_orders_labor_cost_non_negative: {
    field: "labor_cost",
    message: "El costo no puede ser negativo.",
  },
  work_orders_parts_cost_non_negative: {
    field: "parts_cost",
    message: "El costo no puede ser negativo.",
  },
  work_orders_started_after_reported: {
    field: "started_at",
    message: "El inicio no puede ser anterior al reporte.",
  },
  work_orders_resolved_after_reported: {
    field: "resolved_at",
    message: "La resolución no puede ser anterior al reporte.",
  },
  work_orders_resolved_after_started: {
    field: "resolved_at",
    message: "La resolución no puede ser anterior al inicio.",
  },
  work_orders_resolved_at_matches_status: {
    field: "resolved_at",
    message: "Solo una orden resuelta tiene fecha de resolución.",
  },
  work_orders_assigned_requires_technician: {
    field: "assigned_technician_id",
    message: "Una orden asignada requiere un técnico.",
  },
};

export function mapWorkOrderError(error: DbError): MappedError {
  if (error.code === "P0001" && RAISED_ERRORS[error.message]) {
    return RAISED_ERRORS[error.message];
  }
  if (error.code === PG_CHECK_VIOLATION) {
    const match = Object.keys(CHECK_CONSTRAINTS).find((name) =>
      error.message.includes(name),
    );
    if (match) return CHECK_CONSTRAINTS[match];
  }
  if (error.code === PG_FOREIGN_KEY_VIOLATION) {
    return RAISED_ERRORS.equipment_not_available;
  }
  if (error.code === "42501") {
    return { message: "No tienes permiso para realizar esta acción." };
  }
  console.error("work order write failed:", error.code);
  return { message: "No se pudo guardar la orden. Intenta de nuevo." };
}

export function toServiceError(error: DbError): ServiceResult<never> {
  const mapped = mapWorkOrderError(error);
  return mapped.field
    ? {
        ok: false,
        error: "Revisa los campos marcados.",
        fieldErrors: { [mapped.field]: mapped.message },
      }
    : { ok: false, error: mapped.message };
}

export const NOT_FOUND_MESSAGE = RAISED_ERRORS.work_order_not_found.message;
