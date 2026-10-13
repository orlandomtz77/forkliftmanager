import {
  OPEN_STATUSES,
  WORK_ORDER_STATUSES,
  isOverdue,
  repairDuration,
  type WorkOrderStatus,
} from "@/lib/domain/work-orders";

// Dashboard KPIs (docs/requirements.md, RF-DASH). Pure functions over stored
// records so the numbers are never duplicated or stale.

export type KpiWorkOrder = {
  status: WorkOrderStatus;
  target_date: string | null;
  started_at: string | null;
  resolved_at: string | null;
  labor_cost: number;
  parts_cost: number;
};

export type WorkOrderKpis = {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  byStatus: Record<WorkOrderStatus, number>;
  repair: {
    /** Resolved orders with both timestamps. */
    completedCount: number;
    averageMs: number | null;
    maxMs: number | null;
    /** Open orders already started (provisional elapsed time). */
    inProgressCount: number;
    averageProvisionalMs: number | null;
    /** Resolved orders without a start timestamp (excluded from averages). */
    missingDataCount: number;
  };
  cost: {
    labor: number;
    parts: number;
    /** Recorded labor + parts; not total business cost. */
    recorded: number;
  };
};

const toCents = (amount: number) => Math.round(amount * 100);

const average = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;

export function emptyStatusCounts(): Record<WorkOrderStatus, number> {
  return Object.fromEntries(
    WORK_ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<WorkOrderStatus, number>;
}

/**
 * Computes the work-order KPIs.
 * - Open: status is neither resolved nor cancelled.
 * - Overdue: open with a target date before `today` (business date).
 * - Repair duration: resolved_at − started_at; open started orders are
 *   reported separately as provisional elapsed time until `now`.
 * - Recorded cost: labor + parts summed in cents to avoid float drift.
 */
export function computeWorkOrderKpis(
  workOrders: readonly KpiWorkOrder[],
  today: string,
  now: Date = new Date(),
): WorkOrderKpis {
  const byStatus = emptyStatusCounts();
  const completed: number[] = [];
  const provisional: number[] = [];
  let overdue = 0;
  let missingDataCount = 0;
  let laborCents = 0;
  let partsCents = 0;

  for (const wo of workOrders) {
    byStatus[wo.status] += 1;
    if (isOverdue(wo, today)) overdue += 1;

    const duration = repairDuration(wo, now);
    if (duration?.provisional) provisional.push(duration.ms);
    else if (duration && wo.status === "resolved") completed.push(duration.ms);
    else if (wo.status === "resolved") missingDataCount += 1;

    laborCents += toCents(wo.labor_cost);
    partsCents += toCents(wo.parts_cost);
  }

  const open = OPEN_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);

  return {
    total: workOrders.length,
    open,
    closed: workOrders.length - open,
    overdue,
    byStatus,
    repair: {
      completedCount: completed.length,
      averageMs: average(completed),
      maxMs: completed.length === 0 ? null : Math.max(...completed),
      inProgressCount: provisional.length,
      averageProvisionalMs: average(provisional),
      missingDataCount,
    },
    cost: {
      labor: laborCents / 100,
      parts: partsCents / 100,
      recorded: (laborCents + partsCents) / 100,
    },
  };
}

/** Overdue orders first by oldest target date. */
export function overdueWorkOrders<
  T extends { status: WorkOrderStatus; target_date: string | null },
>(workOrders: readonly T[], today: string): T[] {
  return workOrders
    .filter((wo) => isOverdue(wo, today))
    .sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""));
}
