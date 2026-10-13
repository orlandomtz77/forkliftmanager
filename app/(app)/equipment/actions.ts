"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthorizationError, requireRole } from "@/lib/auth/session";
import {
  equipmentInputSchema,
  idSchema,
} from "@/lib/validations/equipment";
import { createEquipment, updateEquipment } from "@/lib/services/equipment";
import type { FieldErrors } from "@/lib/services/db-errors";

export type EquipmentFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  /** Submitted values, echoed back so the form keeps them after an error. */
  values?: Record<string, string>;
};

export type ActionResult = { error?: string };

const FORM_FIELDS = [
  "asset_code",
  "serial_number",
  "brand",
  "model",
  "hour_meter",
  "operational_status",
] as const;

function readForm(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    FORM_FIELDS.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  );
}

/** Returns an error message when the user is not an admin. */
async function denyUnlessAdmin(): Promise<string | null> {
  try {
    await requireRole("admin");
    return null;
  } catch (error) {
    if (error instanceof AuthorizationError) return error.message;
    throw error;
  }
}

function validate(values: Record<string, string>) {
  const parsed = equipmentInputSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data } as const;
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    fieldErrors[field] ??= issue.message;
  }
  return { fieldErrors } as const;
}

export async function createEquipmentAction(
  _prev: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const values = readForm(formData);
  const denied = await denyUnlessAdmin();
  if (denied) return { error: denied, values };

  const result = validate(values);
  if (!result.data) {
    return { error: "Revisa los campos marcados.", fieldErrors: result.fieldErrors, values };
  }

  const saved = await createEquipment(result.data);
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors, values };

  revalidatePath("/equipment");
  redirect(`/equipment/${saved.data.id}`);
}

export async function updateEquipmentAction(
  id: string,
  _prev: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const values = readForm(formData);
  const denied = await denyUnlessAdmin();
  if (denied) return { error: denied, values };

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Equipo no válido.", values };

  const result = validate(values);
  if (!result.data) {
    return { error: "Revisa los campos marcados.", fieldErrors: result.fieldErrors, values };
  }

  const saved = await updateEquipment(parsedId.data, result.data);
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.fieldErrors, values };

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${parsedId.data}`);
  redirect(`/equipment/${parsedId.data}`);
}

const setActiveSchema = z.object({ id: idSchema, active: z.boolean() });

export async function setEquipmentActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const denied = await denyUnlessAdmin();
  if (denied) return { error: denied };

  const parsed = setActiveSchema.safeParse({ id, active });
  if (!parsed.success) return { error: "Solicitud no válida." };

  const saved = await updateEquipment(parsed.data.id, {
    is_active: parsed.data.active,
  });
  if (!saved.ok) return { error: saved.error };

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${parsed.data.id}`);
  return {};
}
