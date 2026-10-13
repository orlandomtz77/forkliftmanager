// Business time zone helpers. All "business dates" (overdue checks, date
// filters, datetime inputs) are interpreted in America/Mexico_City.

export const BUSINESS_TIME_ZONE = "America/Mexico_City";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date): ZonedParts {
  const parts = Object.fromEntries(
    partsFormatter
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return parts as ZonedParts;
}

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

/** Offset (ms) between business local time and UTC at the given instant. */
function offsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a business-local wall-clock time to a UTC instant. */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess));
  const second = guess - offsetMs(new Date(first));
  return new Date(second);
}

/** Current business date as "YYYY-MM-DD". */
export function businessToday(now: Date = new Date()): string {
  const p = zonedParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** ISO instant → "YYYY-MM-DDTHH:mm" in business time (for datetime-local inputs). */
export function toBusinessDateTimeInput(iso: string): string {
  const p = zonedParts(new Date(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** "YYYY-MM-DDTHH:mm" in business time → ISO instant, or null if invalid. */
export function parseBusinessDateTime(value: string): string | null {
  const match = DATETIME_LOCAL.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }
  const date = zonedWallTimeToUtc(year, month, day, hour, minute);
  // Reject impossible dates such as 2026-02-31 (they roll over).
  if (toBusinessDateTimeInput(date.toISOString()).slice(0, 10) !== value.slice(0, 10)) {
    return null;
  }
  return date.toISOString();
}

/** Start of a business day ("YYYY-MM-DD") as an ISO instant. */
export function businessDayStart(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return zonedWallTimeToUtc(year, month, day).toISOString();
}

/** Start of the business day after `date`, as an ISO instant. */
export function businessDayEnd(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedWallTimeToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
  ).toISOString();
}
