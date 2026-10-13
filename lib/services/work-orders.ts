import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_STATUSES,
  type WorkOrderStatus,
} from "@/lib/domain/work-orders";
import type {
  AdminWorkOrderFields,
  CreateWorkOrderInput,
  WorkFields,
  WorkOrderFilters,
} from "@/lib/validations/work-orders";
import {
  businessDayEnd,
  businessDayStart,
} from "@/lib/utils/business-time";
import type { ServiceResult } from "@/lib/services/db-errors";
import {
  NOT_FOUND_MESSAGE,
  toServiceError,
} from "@/lib/services/work-order-errors";

// Data access for work orders. Authorization is enforced by RLS and triggers;
// server actions also check permissions before calling these functions.

const LIST_LIMIT = 200;

const LIST_COLUMNS = `
  id, work_order_number, title, status, priority, reported_at, target_date,
  started_at, resolved_at, labor_cost, parts_cost, assigned_technician_id,
  equipment:equipment!work_orders_equipment_id_fkey (id, asset_code, brand, model),
  technician:profiles!work_orders_assigned_technician_id_fkey (id, full_name)
`;

const DETAIL_COLUMNS = `
  *,
  equipment:equipment!work_orders_equipment_id_fkey (id, asset_code, brand, model, operational_status, is_active),
  technician:profiles!work_orders_assigned_technician_id_fkey (id, full_name),
  creator:profiles!work_orders_created_by_fkey (id, full_name)
`;

export async function listWorkOrders(
  filters: WorkOrderFilters & { assignedTo?: string },
) {
  const supabase = await createClient();
  let query = supabase
    .from("work_orders")
    .select(LIST_COLUMNS)
    .order("reported_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.status === "open") {
    query = query.not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
  } else if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.equipment) query = query.eq("equipment_id", filters.equipment);
  if (filters.assignedTo) {
    query = query.eq("assigned_technician_id", filters.assignedTo);
  }
  if (filters.from) query = query.gte("reported_at", businessDayStart(filters.from));
  if (filters.to) query = query.lt("reported_at", businessDayEnd(filters.to));
  if (filters.q) {
    // filters.q is sanitized by searchParamSchema (no PostgREST syntax).
    const pattern = `%${filters.q}%`;
    query = query.or(`work_order_number.ilike.${pattern},title.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("No se pudieron cargar las órdenes de trabajo.", { cause: error });
  }
  return data;
}

export type WorkOrderListItem = Awaited<ReturnType<typeof listWorkOrders>>[number];

export async function getWorkOrder(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("No se pudo cargar la orden de trabajo.", { cause: error });
  }
  return data;
}

export type WorkOrderDetail = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;

export async function getStatusHistory(workOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_status_history")
    .select(
      "id, previous_status, new_status, changed_at, note, changed_by_profile:profiles!work_order_status_history_changed_by_fkey (full_name)",
    )
    .eq("work_order_id", workOrderId)
    .order("changed_at", { ascending: true });
  if (error) {
    throw new Error("No se pudo cargar el historial.", { cause: error });
  }
  return data;
}

// Writes -----------------------------------------------------------------------

export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { reported_at, ...rest } = input;
  const { data, error } = await supabase
    .from("work_orders")
    // Omitted reported_at falls back to the database default (now()).
    .insert({ ...rest, reported_at: reported_at ?? undefined })
    .select("id")
    .single();
  if (error) return toServiceError(error);
  return { ok: true, data };
}

export async function updateWorkOrder(
  id: string,
  patch: Partial<AdminWorkOrderFields> & Partial<WorkFields>,
): Promise<ServiceResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return toServiceError(error);
  if (!data) return { ok: false, error: NOT_FOUND_MESSAGE };
  return { ok: true, data };
}

export async function changeWorkOrderStatus(
  id: string,
  status: WorkOrderStatus,
  note: string | null,
): Promise<ServiceResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_work_order_status", {
    p_work_order_id: id,
    p_new_status: status,
    p_note: note ?? undefined,
  });
  if (error) return toServiceError(error);
  return { ok: true, data: null };
}
