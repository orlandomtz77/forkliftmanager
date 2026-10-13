"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { canTransition, canUpdateWorkOrder } from "@/lib/domain/work-orders";
import { idSchema } from "@/lib/validations/common";
import {
  adminWorkOrderFieldsSchema,
  changeStatusSchema,
  createWorkOrderSchema,
  keepUnchangedTimestamp,
  validateWorkTimestamps,
  workFieldsSchema,
} from "@/lib/validations/work-orders";
import {
  changeWorkOrderStatus,
  createWorkOrder,
  getWorkOrder,
  updateWorkOrder,
} from "@/lib/services/work-orders";
import type { FieldErrors } from "@/lib/services/db-errors";

export type WorkOrderFormState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  /** Submitted values, echoed back so the form keeps them after an error. */
  values?: Record<string, string>;
};

const CREATE_FIELDS = [
  "equipment_id",
  "title",
  "description",
  "priority",
  "reported_at",
  "target_date",
  "failure_cause",
  "assigned_technician_id",
] as const;

const ADMIN_FIELDS = [
  "title",
  "description",
  "priority",
  "reported_at",
  "target_date",
  "assigned_technician_id",
] as const;

const WORK_FIELDS = [
  "failure_cause",
  "resolution_notes",
  "labor_cost",
  "parts_cost",
  "started_at",
  "resolved_at",
] as const;

function readForm(
  formData: FormData,
  fields: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  );
}

function collectErrors(error: z.ZodError, into: FieldErrors = {}): FieldErrors {
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    into[field] ??= issue.message;
  }
  return into;
}

const INVALID_FORM = "Revisa los campos marcados.";


function revalidateWorkOrder(id: string) {
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/equipment", "layout");
  revalidatePath("/dashboard");
}

export async function createWorkOrderAction(
  _prev: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireUser();
  const values = readForm(formData, CREATE_FIELDS);
  // Only admins assign technicians; ignore the field for everyone else.
  if (user.role !== "admin") values.assigned_technician_id = "";

  const parsed = createWorkOrderSchema.safeParse(values);
  if (!parsed.success) {
    return { error: INVALID_FORM, fieldErrors: collectErrors(parsed.error), values };
  }
  if (parsed.data.reported_at) {
    const timestampErrors = validateWorkTimestamps({
      reported_at: parsed.data.reported_at,
      started_at: null,
      resolved_at: null,
    });
    if (Object.keys(timestampErrors).length > 0) {
      return { error: INVALID_FORM, fieldErrors: timestampErrors, values };
    }
  }

  const saved = await createWorkOrder(parsed.data);
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors, values };

  revalidateWorkOrder(saved.data.id);
  redirect(`/work-orders/${saved.data.id}`);
}

export async function updateWorkOrderAction(
  id: string,
  _prev: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const values = readForm(formData, isAdmin ? [...ADMIN_FIELDS, ...WORK_FIELDS] : WORK_FIELDS);

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Orden no válida.", values };

  const workOrder = await getWorkOrder(parsedId.data);
  if (!workOrder || !canUpdateWorkOrder(user, workOrder)) {
    return { error: "Orden no encontrada o sin permiso para modificarla.", values };
  }

  const fieldErrors: FieldErrors = {};
  const work = workFieldsSchema.safeParse(values);
  if (!work.success) collectErrors(work.error, fieldErrors);
  const admin = isAdmin ? adminWorkOrderFieldsSchema.safeParse(values) : null;
  if (admin && !admin.success) collectErrors(admin.error, fieldErrors);
  if (!work.success || (admin && !admin.success)) {
    return { error: INVALID_FORM, fieldErrors, values };
  }

  const patch = { ...work.data, ...(admin?.success ? admin.data : {}) };
  patch.started_at = keepUnchangedTimestamp(values.started_at, patch.started_at, workOrder.started_at);
  patch.resolved_at = keepUnchangedTimestamp(values.resolved_at, patch.resolved_at, workOrder.resolved_at);
  if (patch.reported_at) {
    patch.reported_at =
      keepUnchangedTimestamp(values.reported_at, patch.reported_at, workOrder.reported_at) ??
      patch.reported_at;
  }

  Object.assign(
    fieldErrors,
    validateWorkTimestamps({
      reported_at: patch.reported_at ?? workOrder.reported_at,
      started_at: patch.started_at,
      resolved_at: patch.resolved_at,
    }),
  );
  if (workOrder.status === "resolved" && !patch.resolved_at) {
    fieldErrors.resolved_at ??= "Una orden resuelta requiere fecha de resolución.";
  }
  if (workOrder.status !== "resolved" && patch.resolved_at) {
    fieldErrors.resolved_at ??= "Solo una orden resuelta tiene fecha de resolución.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: INVALID_FORM, fieldErrors, values };
  }

  const saved = await updateWorkOrder(workOrder.id, patch);
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors, values };

  revalidateWorkOrder(workOrder.id);
  redirect(`/work-orders/${workOrder.id}`);
}

export async function changeStatusAction(
  id: string,
  _prev: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireUser();
  const values = readForm(formData, ["status", "note"]);

  const parsed = changeStatusSchema.safeParse({ id, ...values });
  if (!parsed.success) {
    return { error: INVALID_FORM, fieldErrors: collectErrors(parsed.error), values };
  }

  const workOrder = await getWorkOrder(parsed.data.id);
  if (!workOrder || !canUpdateWorkOrder(user, workOrder)) {
    return { error: "Orden no encontrada o sin permiso para modificarla.", values };
  }
  if (!canTransition(workOrder.status, parsed.data.status)) {
    return { error: "Ese cambio de estado no está permitido.", values };
  }
  if (parsed.data.status === "assigned" && !workOrder.assigned_technician_id) {
    return { error: "Asigna un técnico antes de marcar la orden como asignada.", values };
  }

  const saved = await changeWorkOrderStatus(
    workOrder.id,
    parsed.data.status,
    parsed.data.note,
  );
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors, values };

  revalidateWorkOrder(workOrder.id);
  return { success: "Estado actualizado." };
}
