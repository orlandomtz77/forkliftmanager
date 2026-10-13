"use client";

import { useState, useTransition } from "react";
import { setEquipmentActiveAction } from "@/app/(app)/equipment/actions";

type ActiveToggleProps = {
  equipmentId: string;
  isActive: boolean;
};

/** Deactivate/reactivate with an inline confirmation step. */
export function ActiveToggle({ equipmentId, isActive }: ActiveToggleProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actionLabel = isActive ? "Desactivar equipo" : "Reactivar equipo";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await setEquipmentActiveAction(equipmentId, !isActive);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div
          role="group"
          aria-label="Confirmar cambio"
          className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
        >
          <p>
            {isActive
              ? "El equipo dejará de aparecer en la lista de activos. Su historial se conserva. ¿Continuar?"
              : "El equipo volverá a la lista de activos. ¿Continuar?"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {pending ? "Guardando…" : `Sí, ${actionLabel.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
