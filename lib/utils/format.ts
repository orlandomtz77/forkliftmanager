export const BUSINESS_TIME_ZONE = "America/Mexico_City";

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

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
