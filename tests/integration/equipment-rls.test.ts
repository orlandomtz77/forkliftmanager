import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ADMIN, anonClient, signedInClient, TECHNICIAN } from "./helpers";

// Rows created here stay in the local DB (no delete policy by design);
// `npm run db:reset` clears them. Codes are unique per run.
const run = randomUUID().slice(0, 8).toUpperCase();
const code = (suffix: string) => `T-${run}-${suffix}`;

let admin: SupabaseClient<Database>;
let technician: SupabaseClient<Database>;

beforeAll(async () => {
  admin = await signedInClient(ADMIN.email);
  technician = await signedInClient(TECHNICIAN.email);
});

function newEquipment(suffix: string) {
  return {
    asset_code: code(suffix),
    brand: "Toyota",
    model: "8FGU25",
  };
}

describe("equipment RLS and constraints", () => {
  it("lets an admin create and retrieve equipment", async () => {
    const { data: created, error } = await admin
      .from("equipment")
      .insert({ ...newEquipment("A"), serial_number: "  ", hour_meter: 10.5 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(created?.serial_number).toBeNull(); // blank normalized to NULL
    expect(created?.operational_status).toBe("available");

    const { data: fetched } = await technician
      .from("equipment")
      .select("asset_code")
      .eq("id", created!.id)
      .single();
    expect(fetched?.asset_code).toBe(code("A"));
  });

  it("rejects duplicate asset codes regardless of case and spaces", async () => {
    await admin.from("equipment").insert(newEquipment("DUP"));
    const { error } = await admin
      .from("equipment")
      .insert({ ...newEquipment("DUP"), asset_code: ` ${code("dup")} ` });
    expect(error?.code).toBe("23505");
  });

  it("rejects duplicate serial numbers but allows many without serial", async () => {
    const serial = `SN-${run}`;
    const first = await admin
      .from("equipment")
      .insert({ ...newEquipment("S1"), serial_number: serial });
    expect(first.error).toBeNull();

    const dup = await admin
      .from("equipment")
      .insert({ ...newEquipment("S2"), serial_number: serial.toLowerCase() });
    expect(dup.error?.code).toBe("23505");

    const noSerialA = await admin.from("equipment").insert(newEquipment("N1"));
    const noSerialB = await admin.from("equipment").insert(newEquipment("N2"));
    expect(noSerialA.error).toBeNull();
    expect(noSerialB.error).toBeNull();
  });

  it("rejects a negative hour meter", async () => {
    const { error } = await admin
      .from("equipment")
      .insert({ ...newEquipment("NEG"), hour_meter: -1 });
    expect(error?.code).toBe("23514");
  });

  it("denies anonymous reads and writes", async () => {
    const anon = anonClient();
    const read = await anon.from("equipment").select("id");
    expect(read.error !== null || read.data?.length === 0).toBe(true);

    const write = await anon.from("equipment").insert(newEquipment("ANON"));
    expect(write.error).not.toBeNull();
  });

  it("prevents a technician from creating or updating equipment", async () => {
    const insert = await technician
      .from("equipment")
      .insert(newEquipment("TECH"));
    expect(insert.error).not.toBeNull();

    const { data: target } = await admin
      .from("equipment")
      .insert(newEquipment("TECH-UPD"))
      .select("id")
      .single();
    const { data: updated } = await technician
      .from("equipment")
      .update({ operational_status: "out_of_service" })
      .eq("id", target!.id)
      .select();
    expect(updated ?? []).toHaveLength(0);
  });

  it("lets an admin deactivate equipment but nobody can delete it", async () => {
    const { data: target } = await admin
      .from("equipment")
      .insert(newEquipment("DEACT"))
      .select("id")
      .single();

    const { data: deactivated } = await admin
      .from("equipment")
      .update({ is_active: false })
      .eq("id", target!.id)
      .select("is_active")
      .single();
    expect(deactivated?.is_active).toBe(false);

    const { data: deleted } = await admin
      .from("equipment")
      .delete()
      .eq("id", target!.id)
      .select();
    expect(deleted ?? []).toHaveLength(0);

    const { data: stillThere } = await admin
      .from("equipment")
      .select("id")
      .eq("id", target!.id);
    expect(stillThere).toHaveLength(1);
  });
});
