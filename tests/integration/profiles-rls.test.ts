import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  ADMIN,
  anonClient,
  signedInClient,
  TECHNICIAN,
} from "./helpers";

let admin: SupabaseClient<Database>;
let technician: SupabaseClient<Database>;

beforeAll(async () => {
  admin = await signedInClient(ADMIN.email);
  technician = await signedInClient(TECHNICIAN.email);
});

afterAll(async () => {
  // Restore seed state in case an assertion failed mid-test.
  await admin
    .from("profiles")
    .update({ is_active: true, role: "technician" })
    .eq("id", TECHNICIAN.id);
});

describe("profiles RLS", () => {
  it("denies anonymous reads", async () => {
    const { data, error } = await anonClient().from("profiles").select("id");
    // Grants are revoked for anon, so PostgREST returns an error or no rows.
    expect(error !== null || data?.length === 0).toBe(true);
  });

  it("denies sign-up through the public API", async () => {
    const { error } = await anonClient().auth.signUp({
      email: "intruder@example.test",
      password: "Password123!",
    });
    expect(error).not.toBeNull();
  });

  it("lets active users read profiles", async () => {
    const { data, error } = await technician.from("profiles").select("id, role");
    expect(error).toBeNull();
    expect(data?.map((p) => p.id).sort()).toEqual([ADMIN.id, TECHNICIAN.id]);
  });

  it("prevents a technician from promoting themselves", async () => {
    const { data } = await technician
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", TECHNICIAN.id)
      .select();
    expect(data ?? []).toHaveLength(0);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", TECHNICIAN.id)
      .single();
    expect(profile?.role).toBe("technician");
  });

  it("prevents inserts and deletes through the API", async () => {
    const insert = await admin
      .from("profiles")
      .insert({ id: "00000000-0000-4000-8000-0000000000ff" });
    expect(insert.error).not.toBeNull();

    const { data } = await admin
      .from("profiles")
      .delete()
      .eq("id", TECHNICIAN.id)
      .select();
    expect(data ?? []).toHaveLength(0);
  });

  it("lets an admin update another profile", async () => {
    const { data, error } = await admin
      .from("profiles")
      .update({ full_name: "Técnico Renombrado" })
      .eq("id", TECHNICIAN.id)
      .select("full_name");
    expect(error).toBeNull();
    expect(data?.[0]?.full_name).toBe("Técnico Renombrado");

    await admin
      .from("profiles")
      .update({ full_name: "Técnico de Prueba" })
      .eq("id", TECHNICIAN.id);
  });

  it("blocks reads for a deactivated user", async () => {
    await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", TECHNICIAN.id);

    const { data } = await technician.from("profiles").select("id");
    expect(data ?? []).toHaveLength(0);

    await admin
      .from("profiles")
      .update({ is_active: true })
      .eq("id", TECHNICIAN.id);
  });
});
