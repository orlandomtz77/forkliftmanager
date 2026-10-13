import type { Database } from "@/types/database";
import type { CurrentUser } from "@/lib/auth/session";

type Enums = Database["public"]["Enums"];

export const WORK_ORDER_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "waiting_parts",
  "waiting_authorization",
  "resolved",
  "cancelled",
] as const satisfies readonly Enums["work_order_status"][];

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  new: "Nueva",
  assigned: "Asignada",
  in_progress: "En progreso",
  waiting_parts: "Esperando refacciones",
  waiting_authorization: "Esperando autorización",
  resolved: "Resuelta",
  cancelled: "Cancelada",
};

export const CLOSED_STATUSES = ["resolved", "cancelled"] as const;
export const OPEN_STATUSES = WORK_ORDER_STATUSES.filter(
  (status) => !(CLOSED_STATUSES as readonly string[]).includes(status),
);

export const WORK_ORDER_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Enums["work_order_priority"][];

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

/**
 * Allowed status transitions (docs/requirements.md). The database enforces
 * the same matrix in work_order_transition_allowed(); tests keep them in sync.
 */
export const WORK_ORDER_TRANSITIONS: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  new: ["assigned", "in_progress", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: [
    "waiting_parts",
    "waiting_authorization",
    "resolved",
    "cancelled",
  ],
  waiting_parts: ["in_progress", "cancelled"],
  waiting_authorization: ["in_progress", "cancelled"],
  resolved: [],
  cancelled: [],
};

export function canTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): boolean {
  return WORK_ORDER_TRANSITIONS[from].includes(to);
}

export function isOpen(status: WorkOrderStatus): boolean {
  return !(CLOSED_STATUSES as readonly WorkOrderStatus[]).includes(status);
}

/**
 * Overdue: still open and the target date is before the current business
 * date. `today` is "YYYY-MM-DD" in the business time zone.
 */
export function isOverdue(
  workOrder: { status: WorkOrderStatus; target_date: string | null },
  today: string,
): boolean {
  return (
    isOpen(workOrder.status) &&
    workOrder.target_date !== null &&
    workOrder.target_date < today
  );
}

/** Recorded labor + parts cost, rounded to cents. Not total business cost. */
export function recordedCost(laborCost: number, partsCost: number): number {
  return Math.round((laborCost + partsCost) * 100) / 100;
}

export type RepairDuration = { ms: number; provisional: boolean };

/**
 * Repair duration = resolved_at − started_at. For an order that started but
 * is not resolved, elapsed time until `now` is returned as provisional.
 */
export function repairDuration(
  workOrder: {
    status: WorkOrderStatus;
    started_at: string | null;
    resolved_at: string | null;
  },
  now: Date = new Date(),
): RepairDuration | null {
  if (!workOrder.started_at) return null;
  const start = new Date(workOrder.started_at).getTime();
  if (workOrder.resolved_at) {
    return { ms: new Date(workOrder.resolved_at).getTime() - start, provisional: false };
  }
  if (!isOpen(workOrder.status)) return null;
  return { ms: Math.max(0, now.getTime() - start), provisional: true };
}

/** Admins update any order; technicians only orders assigned to them. */
export function canUpdateWorkOrder(
  user: Pick<CurrentUser, "id" | "role">,
  workOrder: { assigned_technician_id: string | null },
): boolean {
  return (
    user.role === "admin" ||
    (user.role === "technician" && workOrder.assigned_technician_id === user.id)
  );
}

export type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
export type WorkOrderStatusHistory =
  Database["public"]["Tables"]["work_order_status_history"]["Row"];
