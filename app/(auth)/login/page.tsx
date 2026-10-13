import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Forklift Service Manager</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Inicia sesión para continuar.
        </p>
        <LoginForm />
        <p className="mt-6 text-xs text-slate-500">
          ¿No tienes cuenta? Solicítala a un administrador.
        </p>
      </div>
    </main>
  );
}
