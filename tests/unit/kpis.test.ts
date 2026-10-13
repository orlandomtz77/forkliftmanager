import { describe, expect, it } from "vitest";
import {
  computeWorkOrderKpis,
  overdueWorkOrders,
  type KpiWorkOrder,
} from "@/lib/domain/kpis";
import { dashboardFiltersSchema } from "@/lib/validations/dashboard";

const TODAY = "2026-10-13";
const NOW = new Date("2026-10-13T18:00:00Z");
const HOUR = 3_600_000;

function wo(overrides: Partial<KpiWorkOrder> = {}): KpiWorkOrder {
  return {
    status: "new",
    target_date: null,
    started_at: null,
    resolved_at: null,
    labor_cost: 0,
    parts_cost: 0,
    ...overrides,
  };
}

describe("computeWorkOrderKpis", () => {
  it("returns zeros and no averages for an empty set", () => {
    const kpis = computeWorkOrderKpis([], TODAY, NOW);
    expect(kpis).toMatchObject({ total: 0, open: 0, closed: 0, overdue: 0 });
    expect(kpis.repair.averageMs).toBeNull();
    expect(kpis.repair.averageProvisionalMs).toBeNull();
    expect(kpis.cost.recorded).toBe(0);
  });

  it("counts open and closed orders by status (§12.8)", () => {
    const kpis = computeWorkOrderKpis(
      [
        wo({ status: "new" }),
        wo({ status: "assigned" }),
        wo({ status: "in_progress", started_at: "2026-10-13T10:00:00Z" }),
        wo({ status: "waiting_parts", started_at: "2026-10-13T10:00:00Z" }),
        wo({ status: "waiting_authorization", started_at: "2026-10-13T10:00:00Z" }),
        wo({ status: "resolved", started_at: "2026-10-12T10:00:00Z", resolved_at: "2026-10-12T12:00:00Z" }),
        wo({ status: "cancelled" }),
      ],
      TODAY,
      NOW,
    );
    expect(kpis.total).toBe(7);
    expect(kpis.open).toBe(5);
    expect(kpis.closed).toBe(2);
    expect(kpis.byStatus.waiting_parts).toBe(1);
    expect(kpis.byStatus.cancelled).toBe(1);
  });

  it("counts overdue only for open orders with an expired target date (§12.9)", () => {
    const kpis = computeWorkOrderKpis(
      [
        wo({ status: "in_progress", target_date: "2026-10-12", started_at: "2026-10-10T10:00:00Z" }), // overdue
        wo({ status: "new", target_date: TODAY }), // due today: not overdue
        wo({ status: "new", target_date: "2026-10-20" }), // future
        wo({ status: "new", target_date: null }), // no target date
        wo({
          status: "resolved",
          target_date: "2026-10-01",
          started_at: "2026-10-01T10:00:00Z",
          resolved_at: "2026-10-05T10:00:00Z",
        }), // closed
        wo({ status: "cancelled", target_date: "2026-10-01" }), // closed
      ],
      TODAY,
      NOW,
    );
    expect(kpis.overdue).toBe(1);
  });

  it("sums recorded costs exactly from stored labor and parts (§12.10)", () => {
    const kpis = computeWorkOrderKpis(
      [
        wo({ labor_cost: 0.1, parts_cost: 0.2 }),
        wo({ status: "cancelled", labor_cost: 1500, parts_cost: 2349.99 }),
        wo({ labor_cost: 0, parts_cost: 0.01 }),
      ],
      TODAY,
      NOW,
    );
    expect(kpis.cost.labor).toBe(1500.1);
    expect(kpis.cost.parts).toBe(2350.2);
    expect(kpis.cost.recorded).toBe(3850.3);
  });

  it("averages repair duration of resolved orders and reports open ones as provisional", () => {
    const kpis = computeWorkOrderKpis(
      [
        wo({ status: "resolved", started_at: "2026-10-10T10:00:00Z", resolved_at: "2026-10-10T12:00:00Z" }), // 2 h
        wo({ status: "resolved", started_at: "2026-10-11T10:00:00Z", resolved_at: "2026-10-11T16:00:00Z" }), // 6 h
        wo({ status: "resolved", started_at: null, resolved_at: "2026-10-11T16:00:00Z" }), // missing start
        wo({ status: "waiting_parts", started_at: "2026-10-13T14:00:00Z" }), // 4 h until NOW
        wo({ status: "new" }), // not started
        wo({ status: "cancelled", started_at: "2026-10-13T10:00:00Z" }), // ignored
      ],
      TODAY,
      NOW,
    );
    expect(kpis.repair.completedCount).toBe(2);
    expect(kpis.repair.averageMs).toBe(4 * HOUR);
    expect(kpis.repair.maxMs).toBe(6 * HOUR);
    expect(kpis.repair.inProgressCount).toBe(1);
    expect(kpis.repair.averageProvisionalMs).toBe(4 * HOUR);
    expect(kpis.repair.missingDataCount).toBe(1);
  });
});

describe("overdueWorkOrders", () => {
  it("returns open overdue orders sorted by oldest target date", () => {
    const rows = [
      { id: "a", status: "new" as const, target_date: "2026-10-10" },
      { id: "b", status: "assigned" as const, target_date: "2026-10-01" },
      { id: "c", status: "resolved" as const, target_date: "2026-09-01" },
      { id: "d", status: "new" as const, target_date: null },
    ];
    expect(overdueWorkOrders(rows, TODAY).map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("dashboardFiltersSchema", () => {
  it("defaults to all statuses and drops invalid values", () => {
    expect(
      dashboardFiltersSchema.parse({
        status: "bogus",
        priority: "urgent",
        equipment: "not-a-uuid",
        from: "2026-02-30",
        to: ["2026-10-13", "2026-10-14"],
      }),
    ).toEqual({
      equipment: undefined,
      status: "all",
      priority: undefined,
      from: undefined,
      to: "2026-10-13",
    });
  });
});
