import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Synthetic users created by supabase/seed.sql (local only).
export const TEST_PASSWORD = "Password123!";
export const ADMIN = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
};
export const TECHNICIAN = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "technician@example.test",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local.`);
  return value;
}

export function anonClient(): SupabaseClient<Database> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error("Integration tests must run against local Supabase only.");
  }
  return createClient<Database>(
    url,
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function signedInClient(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return client;
}
