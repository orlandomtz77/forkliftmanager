import { describe, expect, it } from "vitest";
import {
  equipmentFiltersSchema,
  equipmentInputSchema,
  sanitizeSearch,
} from "@/lib/validations/equipment";
import { uniqueViolationField } from "@/lib/services/db-errors";

const valid = {
  asset_code: " MC-001 ",
  serial_number: "",
  brand: "Toyota",
  model: "8FGU25",
  hour_meter: "",
  operational_status: "available",
};

describe("equipmentInputSchema", () => {
  it("trims text and turns empty optional fields into null", () => {
    const result = equipmentInputSchema.parse(valid);
    expect(result).toEqual({
      asset_code: "MC-001",
      serial_number: null,
      brand: "Toyota",
      model: "8FGU25",
      hour_meter: null,
      operational_status: "available",
    });
  });

  it("parses the hour meter as a number", () => {
    const result = equipmentInputSchema.parse({ ...valid, hour_meter: "1520.5" });
    expect(result.hour_meter).toBe(1520.5);
  });

  it("rejects a negative hour meter", () => {
    const result = equipmentInputSchema.safeParse({ ...valid, hour_meter: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric hour meter", () => {
    const result = equipmentInputSchema.safeParse({ ...valid, hour_meter: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank asset code", () => {
    const result = equipmentInputSchema.safeParse({ ...valid, asset_code: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown operational status", () => {
    const result = equipmentInputSchema.safeParse({
      ...valid,
      operational_status: "broken",
    });
    expect(result.success).toBe(false);
  });
});

describe("sanitizeSearch", () => {
  it("removes PostgREST syntax and LIKE wildcards (%, _, *)", () => {
    expect(sanitizeSearch("a,b),is_active.eq.false(%*")).toBe(
      "a b is active.eq.false",
    );
  });

  it("keeps accents, digits and common code characters", () => {
    expect(sanitizeSearch("  Montacargas  MC-01/2#  ")).toBe("Montacargas MC-01/2#");
  });
});

describe("equipmentFiltersSchema", () => {
  it("defaults to active equipment and ignores invalid values", () => {
    expect(
      equipmentFiltersSchema.parse({ status: "nope", active: "maybe" }),
    ).toEqual({ q: "", status: undefined, active: "active" });
  });

  it("uses the first value of repeated query params", () => {
    expect(
      equipmentFiltersSchema.parse({ status: ["rented", "available"] }).status,
    ).toBe("rented");
  });
});

describe("uniqueViolationField", () => {
  const indexes = {
    equipment_asset_code_key: "asset_code",
    equipment_serial_number_key: "serial_number",
  };

  it("maps a unique violation to its field", () => {
    expect(
      uniqueViolationField(
        {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "equipment_serial_number_key"',
        },
        indexes,
      ),
    ).toBe("serial_number");
  });

  it("ignores other errors", () => {
    expect(
      uniqueViolationField({ code: "23514", message: "check" }, indexes),
    ).toBeNull();
  });
});
