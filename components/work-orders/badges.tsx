import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/domain/work-orders";

// Color is a secondary cue; the text label always carries the meaning.
const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  new: "border-slate-300 bg-slate-50 text-slate-800",
  assigned: "border-indigo-200 bg-indigo-50 text-indigo-800",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  waiting_parts: "border-amber-200 bg-amber-50 text-amber-900",
  waiting_authorization: "border-orange-200 bg-orange-50 text-orange-900",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-slate-300 bg-slate-100 text-slate-600 line-through",
};

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: "border-slate-200 bg-white text-slate-700",
  medium: "border-sky-200 bg-white text-sky-800",
  high: "border-orange-300 bg-orange-50 text-orange-900",
  critical: "border-red-300 bg-red-50 text-red-800 font-semibold",
};

const badge = "inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`${badge} ${STATUS_STYLES[status]}`}>
      {WORK_ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  return (
    <span className={`${badge} ${PRIORITY_STYLES[priority]}`}>
      Prioridad {WORK_ORDER_PRIORITY_LABELS[priority].toLowerCase()}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={`${badge} border-red-300 bg-red-50 text-red-800`}>
      Vencida
    </span>
  );
}
