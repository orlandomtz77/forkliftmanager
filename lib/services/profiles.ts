import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TechnicianOption = { id: string; full_name: string | null };

/** Active technicians, for assignment selects. */
export async function listTechnicians(): Promise<TechnicianOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "technician")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw new Error("No se pudo cargar la lista de técnicos.", { cause: error });
  return data;
}
