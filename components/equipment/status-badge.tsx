import {
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from "@/lib/domain/equipment";

// Color is a secondary cue; the text label always carries the meaning.
const STATUS_STYLES: Record<EquipmentStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rented: "border-sky-200 bg-sky-50 text-sky-800",
  in_maintenance: "border-amber-200 bg-amber-50 text-amber-900",
  out_of_service: "border-red-200 bg-red-50 text-red-800",
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {EQUIPMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? null : (
    <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      Inactivo
    </span>
  );
}
