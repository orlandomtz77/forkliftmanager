import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  applyWorkOrderFilters,
  type WorkOrderQueryFilters,
} from "@/lib/services/work-orders";

// Read-only data for the dashboard. KPIs are computed from these rows in
// lib/domain/kpis.ts; RLS limits rows to what the user may read.

/** Matches max_rows in supabase/config.toml; larger sets are paged. */
const PAGE_SIZE = 1000;
/** Safety cap so a huge period cannot exhaust server memory. */
const MAX_ROWS = 20_000;

const KPI_COLUMNS = `
  id, work_order_number, title, status, priority, target_date,
  started_at, resolved_at, labor_cost, parts_cost,
  equipment:equipment!work_orders_equipment_id_fkey (id, asset_code)
`;

export async function listWorkOrdersForKpis(filters: WorkOrderQueryFilters) {
  const supabase = await createClient();
  const rows = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const query = applyWorkOrderFilters(
      supabase.from("work_orders").select(KPI_COLUMNS),
      filters,
    )
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) {
      throw new Error("No se pudieron cargar los indicadores.", { cause: error });
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export type KpiWorkOrderRow = Awaited<
  ReturnType<typeof listWorkOrdersForKpis>
>["rows"][number];

/** Fleet counts: active equipment, and active equipment by status. */
export async function getEquipmentCounts() {
  const supabase = await createClient();
  const count = async (status?: "out_of_service" | "in_maintenance") => {
    let query = supabase
      .from("equipment")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (status) query = query.eq("operational_status", status);
    const { count: value, error } = await query;
    if (error) {
      throw new Error("No se pudieron cargar los indicadores de equipos.", {
        cause: error,
      });
    }
    return value ?? 0;
  };
  const [active, outOfService, inMaintenance] = await Promise.all([
    count(),
    count("out_of_service"),
    count("in_maintenance"),
  ]);
  return { active, outOfService, inMaintenance };
}
