import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/domain/roles";
import { LOGIN_PATH } from "@/lib/auth/routes";

export const ACCOUNT_INACTIVE_PATH = "/account-inactive";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
};

export type SessionState =
  | { status: "anonymous" }
  | { status: "inactive" }
  | { status: "active"; user: CurrentUser };

export class AuthorizationError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Reads and verifies the session on the server (getClaims validates the JWT).
 * A missing profile means the account is inactive: RLS hides profiles from
 * users whose own profile is inactive. Cached per request.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { status: "anonymous" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("No se pudo cargar el perfil del usuario.", {
      cause: profileError,
    });
  }
  if (!profile) return { status: "inactive" };

  return {
    status: "active",
    user: {
      id: userId,
      email: typeof data.claims.email === "string" ? data.claims.email : null,
      fullName: profile.full_name,
      role: profile.role,
    },
  };
});

/** For pages and layouts: redirects when there is no active user. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSessionState();
  if (session.status === "anonymous") redirect(LOGIN_PATH);
  if (session.status === "inactive") redirect(ACCOUNT_INACTIVE_PATH);
  return session.user;
}

/** For server actions: throws instead of redirecting on missing permission. */
export async function requireRole(
  ...allowed: readonly AppRole[]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new AuthorizationError();
  return user;
}
