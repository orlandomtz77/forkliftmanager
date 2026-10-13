import type { Metadata } from "next";
import { signOut } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Cuenta inactiva" };

export default function AccountInactivePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Cuenta inactiva</h1>
        <p className="mt-2 mb-6 text-sm text-slate-600">
          Tu cuenta no tiene acceso activo. Contacta a un administrador.
        </p>
        <form action={signOut}>
          <SubmitButton pendingText="Cerrando sesión…" className="w-full">
            Cerrar sesión
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
