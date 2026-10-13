import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Equipment } from "@/lib/domain/equipment";
import type {
  EquipmentFilters,
  EquipmentInput,
} from "@/lib/validations/equipment";
import {
  PG_CHECK_VIOLATION,
  uniqueViolationField,
  type DbError,
  type ServiceResult,
} from "@/lib/services/db-errors";

// Data access for equipment. Authorization is enforced by RLS; callers
// (server actions) must also check the user's role before mutating.

const LIST_LIMIT = 200;

export async function listEquipment(
  filters: EquipmentFilters,
): Promise<Equipment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("equipment")
    .select("*")
    .order("asset_code")
    .limit(LIST_LIMIT);

  if (filters.active !== "all") {
    query = query.eq("is_active", filters.active === "active");
  }
  if (filters.status) {
    query = query.eq("operational_status", filters.status);
  }
  if (filters.q) {
    // filters.q is sanitized by equipmentFiltersSchema (no PostgREST syntax).
    const pattern = `%${filters.q}%`;
    query = query.or(
      ["asset_code", "serial_number", "brand", "model"]
        .map((column) => `${column}.ilike.${pattern}`)
        .join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar el catálogo.", { cause: error });
  return data;
}

export async function getEquipment(id: string): Promise<Equipment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el equipo.", { cause: error });
  return data;
}

function mapWriteError(error: DbError): ServiceResult<never> {
  const field = uniqueViolationField(error, {
    equipment_asset_code_key: "asset_code",
    equipment_serial_number_key: "serial_number",
  });
  if (field === "asset_code") {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { asset_code: "Ya existe un equipo con este código." },
    };
  }
  if (field === "serial_number") {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: { serial_number: "Ya existe un equipo con esta serie." },
    };
  }
  if (error.code === PG_CHECK_VIOLATION) {
    return { ok: false, error: "Algún valor no es válido." };
  }
  console.error("equipment write failed:", error.code);
  return { ok: false, error: "No se pudo guardar el equipo. Intenta de nuevo." };
}

export async function createEquipment(
  input: EquipmentInput,
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert(input)
    .select("id")
    .single();
  if (error) return mapWriteError(error);
  return { ok: true, data };
}

export async function updateEquipment(
  id: string,
  input: Partial<EquipmentInput> & { is_active?: boolean },
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .update(input)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return mapWriteError(error);
  // RLS hides rows the user cannot update, so "no row" covers both cases.
  if (!data) return { ok: false, error: "Equipo no encontrado o sin permiso." };
  return { ok: true, data };
}
