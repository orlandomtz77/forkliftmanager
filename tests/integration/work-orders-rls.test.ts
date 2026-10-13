import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  WORK_ORDER_STATUSES,
  canTransition,
} from "@/lib/domain/work-orders";
import { ADMIN, anonClient, signedInClient, TECHNICIAN } from "./helpers";

// Rows created here stay in the local DB (no delete policy by design);
// `npm run db:reset` clears them.
const run = randomUUID().slice(0, 8).toUpperCase();

let admin: SupabaseClient<Database>;
let technician: SupabaseClient<Database>;
let equipmentId: string;
let inactiveEquipmentId: string;

beforeAll(async () => {
  admin = await signedInClient(ADMIN.email);
  technician = await signedInClient(TECHNICIAN.email);

  const { data: active, error } = await admin
    .from("equipment")
    .insert({ asset_code: `WO-${run}`, brand: "Toyota", model: "8FGU25" })
    .select("id")
    .single();
  if (error) throw error;
  equipmentId = active.id;

  const { data: inactive } = await admin
    .from("equipment")
    .insert({ asset_code: `WO-${run}-OFF`, brand: "Yale", model: "GP050", is_active: false })
    .select("id")
    .single();
  inactiveEquipmentId = inactive!.id;
});

async function createOrder(
  client: SupabaseClient<Database>,
  extra: Partial<Database["public"]["Tables"]["work_orders"]["Insert"]> = {},
) {
  return client
    .from("work_orders")
    .insert({ equipment_id: equipmentId, title: `Falla ${run}`, ...extra })
    .select()
    .single();
}

async function history(id: string) {
  const { data } = await admin
    .from("work_order_status_history")
    .select("previous_status, new_status, note, changed_by")
    .eq("work_order_id", id)
    .order("changed_at");
  return data ?? [];
}

describe("work order creation", () => {
  it("creates an order with a generated number and initial history", async () => {
    const { data, error } = await createOrder(admin);
    expect(error).toBeNull();
    expect(data?.work_order_number).toMatch(/^OT-\d{4}-\d{5}$/);
    expect(data?.status).toBe("new");
    expect(data?.created_by).toBe(ADMIN.id);
    expect(await history(data!.id)).toEqual([
      { previous_status: null, new_status: "new", note: null, changed_by: ADMIN.id },
    ]);
  });

  it("generates unique, increasing numbers", async () => {
    const a = await createOrder(admin);
    const b = await createOrder(admin);
    expect(a.data!.work_order_number < b.data!.work_order_number).toBe(true);
  });

  it("ignores client-provided status, number and timestamps", async () => {
    const { data } = await createOrder(admin, {
      status: "resolved",
      work_order_number: "HACK-1",
      resolved_at: new Date().toISOString(),
    });
    expect(data?.status).toBe("new");
    expect(data?.work_order_number).not.toBe("HACK-1");
    expect(data?.resolved_at).toBeNull();
  });

  it("rejects nonexistent or inactive equipment", async () => {
    const missing = await createOrder(admin, { equipment_id: randomUUID() });
    expect(missing.error?.message).toBe("equipment_not_available");

    const inactive = await createOrder(admin, { equipment_id: inactiveEquipmentId });
    expect(inactive.error?.message).toBe("equipment_not_available");
  });

  it("rejects negative costs and a start before the report", async () => {
    const negative = await createOrder(admin, { labor_cost: -10 });
    expect(negative.error?.code).toBe("23514");

    const { data } = await createOrder(admin);
    const early = await admin
      .from("work_orders")
      .update({ started_at: "2000-01-01T00:00:00Z" })
      .eq("id", data!.id);
    expect(early.error?.code).toBe("23514");
  });

  it("lets a technician report an unassigned order but not assign it", async () => {
    const own = await createOrder(technician);
    expect(own.error).toBeNull();
    expect(own.data?.created_by).toBe(TECHNICIAN.id);

    const assigned = await createOrder(technician, { assigned_technician_id: TECHNICIAN.id });
    expect(assigned.error?.message).toBe("assignment_not_allowed");
  });

  it("only allows assigning active technicians", async () => {
    const toAdmin = await createOrder(admin, { assigned_technician_id: ADMIN.id });
    expect(toAdmin.error?.message).toBe("invalid_technician");
  });
});

describe("work order updates and transitions", () => {
  it("runs the full lifecycle with history and automatic timestamps", async () => {
    const { data: wo } = await createOrder(admin, { labor_cost: 0 });
    const id = wo!.id;

    // Technician cannot touch an order that is not assigned to them.
    const blocked = await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "in_progress",
    });
    expect(blocked.error?.message).toBe("work_order_not_found");

    // Assigning a technician moves the order to "assigned".
    const { data: assigned } = await admin
      .from("work_orders")
      .update({ assigned_technician_id: TECHNICIAN.id })
      .eq("id", id)
      .select("status")
      .single();
    expect(assigned?.status).toBe("assigned");

    // Invalid transition is rejected.
    const skip = await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "resolved",
    });
    expect(skip.error?.message).toBe("invalid_status_transition");

    // Start work: started_at is set automatically.
    const start = await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "in_progress",
      p_note: "Inicio diagnóstico",
    });
    expect(start.error).toBeNull();

    await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "waiting_parts",
      p_note: "Se pidió bomba hidráulica",
    });
    await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "in_progress",
    });

    // Technician records costs and notes on the assigned order.
    const costs = await technician
      .from("work_orders")
      .update({ labor_cost: 1500, parts_cost: 2349.99, resolution_notes: "Se cambió la bomba" })
      .eq("id", id)
      .select("labor_cost, parts_cost")
      .single();
    expect(costs.data).toEqual({ labor_cost: 1500, parts_cost: 2349.99 });

    // Technician cannot change admin-only fields.
    const title = await technician.from("work_orders").update({ title: "Otro" }).eq("id", id);
    expect(title.error?.message).toBe("field_not_allowed");

    const resolve = await technician.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "resolved",
    });
    expect(resolve.error).toBeNull();

    const { data: final } = await admin.from("work_orders").select("*").eq("id", id).single();
    expect(final?.status).toBe("resolved");
    expect(final?.started_at).not.toBeNull();
    expect(final?.resolved_at).not.toBeNull();
    expect(new Date(final!.resolved_at!) >= new Date(final!.started_at!)).toBe(true);

    // Resolved is terminal.
    const reopen = await admin.rpc("change_work_order_status", {
      p_work_order_id: id,
      p_new_status: "in_progress",
    });
    expect(reopen.error?.message).toBe("invalid_status_transition");

    expect(await history(id)).toEqual([
      { previous_status: null, new_status: "new", note: null, changed_by: ADMIN.id },
      { previous_status: "new", new_status: "assigned", note: null, changed_by: ADMIN.id },
      { previous_status: "assigned", new_status: "in_progress", note: "Inicio diagnóstico", changed_by: TECHNICIAN.id },
      { previous_status: "in_progress", new_status: "waiting_parts", note: "Se pidió bomba hidráulica", changed_by: TECHNICIAN.id },
      { previous_status: "waiting_parts", new_status: "in_progress", note: null, changed_by: TECHNICIAN.id },
      { previous_status: "in_progress", new_status: "resolved", note: null, changed_by: TECHNICIAN.id },
    ]);
  });

  it("keeps cancelled orders and never deletes them", async () => {
    const { data: wo } = await createOrder(admin);
    const cancel = await admin.rpc("change_work_order_status", {
      p_work_order_id: wo!.id,
      p_new_status: "cancelled",
      p_note: "Reporte duplicado",
    });
    expect(cancel.error).toBeNull();

    const { data: deleted } = await admin.from("work_orders").delete().eq("id", wo!.id).select();
    expect(deleted ?? []).toHaveLength(0);

    const { data: still } = await admin.from("work_orders").select("status").eq("id", wo!.id).single();
    expect(still?.status).toBe("cancelled");
  });

  it("does not allow a resolution date on an unresolved order", async () => {
    const { data: wo } = await createOrder(admin);
    const { error } = await admin
      .from("work_orders")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", wo!.id);
    expect(error?.code).toBe("23514");
  });

  it("does not let users write status history directly", async () => {
    const { data: wo } = await createOrder(admin);
    const { error } = await admin.from("work_order_status_history").insert({
      work_order_id: wo!.id,
      new_status: "resolved",
    });
    expect(error).not.toBeNull();
  });

  it("denies anonymous access", async () => {
    const anon = anonClient();
    const read = await anon.from("work_orders").select("id");
    expect(read.error !== null || read.data?.length === 0).toBe(true);
    const rpc = await anon.rpc("change_work_order_status", {
      p_work_order_id: randomUUID(),
      p_new_status: "cancelled",
    });
    expect(rpc.error).not.toBeNull();
  });
});

describe("transition matrix", () => {
  it("is identical in the database and in lib/domain/work-orders.ts", async () => {
    for (const from of WORK_ORDER_STATUSES) {
      for (const to of WORK_ORDER_STATUSES) {
        const { data, error } = await admin.rpc("work_order_transition_allowed", {
          p_from: from,
          p_to: to,
        });
        expect(error).toBeNull();
        expect({ from, to, allowed: data }).toEqual({ from, to, allowed: canTransition(from, to) });
      }
    }
  });
});
