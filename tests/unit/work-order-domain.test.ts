import { describe, expect, it } from "vitest";
import {
  canTransition,
  canUpdateWorkOrder,
  isOpen,
  isOverdue,
  recordedCost,
  repairDuration,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TRANSITIONS,
} from "@/lib/domain/work-orders";

describe("status transitions", () => {
  it("follows the approved matrix", () => {
    expect(canTransition("new", "assigned")).toBe(true);
    expect(canTransition("new", "in_progress")).toBe(true);
    expect(canTransition("assigned", "resolved")).toBe(false);
    expect(canTransition("in_progress", "waiting_parts")).toBe(true);
    expect(canTransition("waiting_parts", "resolved")).toBe(false);
    expect(canTransition("waiting_authorization", "in_progress")).toBe(true);
  });

  it("treats resolved and cancelled as terminal", () => {
    for (const to of WORK_ORDER_STATUSES) {
      expect(canTransition("resolved", to)).toBe(false);
      expect(canTransition("cancelled", to)).toBe(false);
    }
  });

  it("allows cancelling any open order", () => {
    for (const from of WORK_ORDER_STATUSES.filter(isOpen)) {
      expect(WORK_ORDER_TRANSITIONS[from]).toContain("cancelled");
    }
  });
});

describe("isOverdue", () => {
  const today = "2026-10-13";

  it("is overdue when open and the target date has passed", () => {
    expect(isOverdue({ status: "waiting_parts", target_date: "2026-10-12" }, today)).toBe(true);
  });

  it("is not overdue on the target date itself", () => {
    expect(isOverdue({ status: "in_progress", target_date: today }, today)).toBe(false);
  });

  it("is never overdue when closed", () => {
    expect(isOverdue({ status: "resolved", target_date: "2026-01-01" }, today)).toBe(false);
    expect(isOverdue({ status: "cancelled", target_date: "2026-01-01" }, today)).toBe(false);
  });

  it("is never overdue without a target date", () => {
    expect(isOverdue({ status: "new", target_date: null }, today)).toBe(false);
  });
});

describe("recordedCost", () => {
  it("adds labor and parts without floating-point noise", () => {
    expect(recordedCost(0.1, 0.2)).toBe(0.3);
    expect(recordedCost(1500, 2349.99)).toBe(3849.99);
  });
});

describe("repairDuration", () => {
  const started_at = "2026-10-13T10:00:00Z";

  it("measures from start to resolution", () => {
    expect(
      repairDuration({ status: "resolved", started_at, resolved_at: "2026-10-13T13:30:00Z" }),
    ).toEqual({ ms: 3.5 * 3_600_000, provisional: false });
  });

  it("is provisional for open orders", () => {
    expect(
      repairDuration(
        { status: "waiting_parts", started_at, resolved_at: null },
        new Date("2026-10-13T12:00:00Z"),
      ),
    ).toEqual({ ms: 2 * 3_600_000, provisional: true });
  });

  it("is unknown without a start time or for cancelled orders", () => {
    expect(repairDuration({ status: "new", started_at: null, resolved_at: null })).toBeNull();
    expect(repairDuration({ status: "cancelled", started_at, resolved_at: null })).toBeNull();
  });
});

describe("canUpdateWorkOrder", () => {
  const admin = { id: "a", role: "admin" as const };
  const tech = { id: "t", role: "technician" as const };

  it("lets admins update any order", () => {
    expect(canUpdateWorkOrder(admin, { assigned_technician_id: null })).toBe(true);
  });

  it("lets technicians update only their assigned orders", () => {
    expect(canUpdateWorkOrder(tech, { assigned_technician_id: "t" })).toBe(true);
    expect(canUpdateWorkOrder(tech, { assigned_technician_id: "other" })).toBe(false);
    expect(canUpdateWorkOrder(tech, { assigned_technician_id: null })).toBe(false);
  });
});
