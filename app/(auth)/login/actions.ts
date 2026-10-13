"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { HOME_PATH } from "@/lib/auth/routes";

export type LoginState = {
  error?: string;
  email?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  const email = typeof rawEmail === "string" ? rawEmail : "";

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "Correo o contraseña incorrectos.", email };
    }
    console.error("signInWithPassword failed:", error.code ?? error.name);
    return {
      error: "No se pudo iniciar sesión. Intenta de nuevo más tarde.",
      email,
    };
  }

  redirect(HOME_PATH);
}
