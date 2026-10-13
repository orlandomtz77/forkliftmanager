"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: LoginState = {};

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const describedBy = state.error ? "login-error" : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          aria-describedby={describedBy}
          className={inputClassName}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={describedBy}
          className={inputClassName}
        />
      </div>
      <div aria-live="polite">
        {state.error ? (
          <p
            id="login-error"
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {state.error}
          </p>
        ) : null}
      </div>
      <SubmitButton pendingText="Ingresando…" className="w-full">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
