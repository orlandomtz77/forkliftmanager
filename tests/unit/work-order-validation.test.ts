import { describe, expect, it } from "vitest";
import {
  createWorkOrderSchema,
  keepUnchangedTimestamp,
  validateWorkTimestamps,
  workFieldsSchema,
  workOrderFiltersSchema,
} from "@/lib/validations/work-orders";
import { mapWorkOrderError } from "@/lib/services/work-order-errors";

const EQUIPMENT_ID = "6f1c2a7e-3b9d-4c1e-9a2f-1b2c3d4e5f60";

describe("createWorkOrderSchema", () => {
  const base = {
    equipment_id: EQUIPMENT_ID,
    title: " No levanta carga ",
    description: "",
    priority: "high",
    reported_at: "",
    target_date: "",
    failure_cause: "",
    assigned_technician_id: "",
  };

  it("normalizes optional fields to null", () => {
    expect(createWorkOrderSchema.parse(base)).toEqual({
      equipment_id: EQUIPMENT_ID,
      title: "No levanta carga",
      description: null,
      priority: "high",
      reported_at: null,
      target_date: null,
      failure_cause: null,
      assigned_technician_id: null,
    });
  });

  it("requires equipment", () => {
    expect(createWorkOrderSchema.safeParse({ ...base, equipment_id: "" }).success).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(createWorkOrderSchema.safeParse({ ...base, target_date: "2026-02-30" }).success).toBe(false);
    expect(createWorkOrderSchema.safeParse({ ...base, reported_at: "ayer" }).success).toBe(false);
  });
});

describe("workFieldsSchema costs", () => {
  const base = {
    failure_cause: "",
    resolution_notes: "",
    labor_cost: "",
    parts_cost: "",
    started_at: "",
    resolved_at: "",
  };

  it("treats empty costs as zero", () => {
    const result = workFieldsSchema.parse(base);
    expect(result.labor_cost).toBe(0);
    expect(result.parts_cost).toBe(0);
  });

  it("rejects negative costs", () => {
    expect(workFieldsSchema.safeParse({ ...base, labor_cost: "-1" }).success).toBe(false);
  });

  it("rejects more than two decimals", () => {
    expect(workFieldsSchema.safeParse({ ...base, parts_cost: "10.005" }).success).toBe(false);
    expect(workFieldsSchema.safeParse({ ...base, parts_cost: "10.05" }).success).toBe(true);
  });
});

describe("validateWorkTimestamps", () => {
  const now = new Date("2026-10-13T18:00:00Z");
  const reported_at = "2026-10-13T12:00:00Z";

  it("accepts a consistent timeline", () => {
    expect(
      validateWorkTimestamps(
        { reported_at, started_at: "2026-10-13T13:00:00Z", resolved_at: "2026-10-13T15:00:00Z" },
        now,
      ),
    ).toEqual({});
  });

  it("rejects a start before the report", () => {
    expect(
      validateWorkTimestamps({ reported_at, started_at: "2026-10-13T11:00:00Z", resolved_at: null }, now),
    ).toHaveProperty("started_at");
  });

  it("rejects a resolution before the start", () => {
    expect(
      validateWorkTimestamps(
        { reported_at, started_at: "2026-10-13T14:00:00Z", resolved_at: "2026-10-13T13:00:00Z" },
        now,
      ),
    ).toHaveProperty("resolved_at");
  });

  it("rejects a report date in the future", () => {
    expect(
      validateWorkTimestamps({ reported_at: "2026-10-14T12:00:00Z", started_at: null, resolved_at: null }, now),
    ).toHaveProperty("reported_at");
  });
});

describe("workOrderFiltersSchema", () => {
  it("defaults to open orders and drops invalid values", () => {
    expect(
      workOrderFiltersSchema.parse({ status: "bogus", equipment: "x", from: "2026-13-01" }),
    ).toEqual({
      q: "",
      equipment: undefined,
      status: "open",
      priority: undefined,
      from: undefined,
      to: undefined,
      mine: false,
    });
  });
});

describe("mapWorkOrderError", () => {
  it("maps trigger errors to fields", () => {
    expect(mapWorkOrderError({ code: "P0001", message: "equipment_not_available" })).toEqual({
      field: "equipment_id",
      message: "El equipo no existe o está inactivo.",
    });
  });

  it("maps check constraints to fields", () => {
    expect(
      mapWorkOrderError({
        code: "23514",
        message:
          'new row for relation "work_orders" violates check constraint "work_orders_started_after_reported"',
      }).field,
    ).toBe("started_at");
  });

  it("maps invalid transitions to a general message", () => {
    expect(
      mapWorkOrderError({ code: "P0001", message: "invalid_status_transition" }),
    ).toEqual({ message: "Ese cambio de estado no está permitido." });
  });
});

describe("keepUnchangedTimestamp", () => {
  const stored = "2026-10-13T17:44:37.123Z"; // 11:44:37 in Mexico City

  it("keeps the stored value (with seconds) when the input was not changed", () => {
    expect(keepUnchangedTimestamp("2026-10-13T11:44", "2026-10-13T17:44:00.000Z", stored)).toBe(stored);
  });

  it("uses the new value when the input changed", () => {
    expect(keepUnchangedTimestamp("2026-10-13T12:00", "2026-10-13T18:00:00.000Z", stored)).toBe(
      "2026-10-13T18:00:00.000Z",
    );
  });

  it("allows clearing the value", () => {
    expect(keepUnchangedTimestamp("", null, stored)).toBeNull();
  });
});
