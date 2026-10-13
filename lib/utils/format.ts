import { BUSINESS_TIME_ZONE } from "@/lib/utils/business-time";

const hoursFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

export function formatHours(value: number | null): string {
  return value === null ? "—" : `${hoursFormatter.format(value)} h`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIME_ZONE,
});

export function formatDateTime(value: string | null): string {
  return value === null ? "—" : dateTimeFormatter.format(new Date(value));
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Formats a calendar date "YYYY-MM-DD" (no time zone shift). */
export function formatDate(value: string | null): string {
  return value === null ? "—" : dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

// Assumption: amounts are recorded in Mexican pesos (see docs/requirements.md).
const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

/** Human-readable duration, e.g. "2 d 3 h", "5 h 20 min", "15 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
