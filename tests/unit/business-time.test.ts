import { describe, expect, it } from "vitest";
import {
  businessDayEnd,
  businessDayStart,
  businessToday,
  parseBusinessDateTime,
  toBusinessDateTimeInput,
} from "@/lib/utils/business-time";

// America/Mexico_City is UTC-6 year-round (no DST since 2022).

describe("businessToday", () => {
  it("uses the Mexico City calendar date, not UTC", () => {
    expect(businessToday(new Date("2026-10-14T03:00:00Z"))).toBe("2026-10-13");
    expect(businessToday(new Date("2026-10-14T06:00:00Z"))).toBe("2026-10-14");
  });
});

describe("parseBusinessDateTime", () => {
  it("interprets datetime-local values in Mexico City time", () => {
    expect(parseBusinessDateTime("2026-10-13T10:30")).toBe("2026-10-13T16:30:00.000Z");
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseBusinessDateTime("2026-02-31T10:00")).toBeNull();
    expect(parseBusinessDateTime("13/10/2026 10:30")).toBeNull();
    expect(parseBusinessDateTime("2026-10-13T24:00")).toBeNull();
  });

  it("round-trips with toBusinessDateTimeInput", () => {
    const iso = parseBusinessDateTime("2026-01-05T07:45")!;
    expect(toBusinessDateTimeInput(iso)).toBe("2026-01-05T07:45");
  });
});

describe("business day bounds", () => {
  it("covers a full Mexico City day", () => {
    expect(businessDayStart("2026-10-13")).toBe("2026-10-13T06:00:00.000Z");
    expect(businessDayEnd("2026-10-13")).toBe("2026-10-14T06:00:00.000Z");
  });

  it("handles month and year boundaries", () => {
    expect(businessDayEnd("2026-12-31")).toBe("2027-01-01T06:00:00.000Z");
  });
});
