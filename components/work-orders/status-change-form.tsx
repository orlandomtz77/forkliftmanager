"use client";

import { useActionState, useState } from "react";
import type { WorkOrderFormState } from "@/app/(app)/work-orders/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  FormField,
  FormMessage,
  fieldA11y,
  inputClassName,
} from "@/components/ui/form-field";
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/lib/domain/work-orders";

type StatusChangeFormProps = {
  action: (
    state: WorkOrderFormState,
    formData: FormData,
  ) => Promise<WorkOrderFormState>;
  allowedStatuses: readonly WorkOrderStatus[];
};

export function StatusChangeForm({ action, allowedStatuses }: StatusChangeFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [selected, setSelected] = useState<string>("");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nuevo estado" htmlFor="status" required error={errors.status}>
          <select
            {...fieldA11y("status", errors.status)}
            required
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecciona…</option>
            {allowedStatuses.map((status) => (
              <option key={status} value={status}>
                {WORK_ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Nota (opcional)" htmlFor="note" error={errors.note}>
          <input
            {...fieldA11y("note", errors.note)}
            maxLength={500}
            placeholder="Ej. refacción solicitada al proveedor"
            className={inputClassName}
          />
        </FormField>
      </div>

      {selected === "cancelled" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          La orden quedará cancelada y no podrá reabrirse. Se conserva en el historial.
        </p>
      ) : null}
      {selected === "resolved" ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Se registrará la fecha de resolución actual. La orden ya no podrá cambiar de estado.
        </p>
      ) : null}

      <FormMessage error={state.error} success={state.success} />

      <SubmitButton pendingText="Actualizando…">
        {selected === "cancelled" ? "Cancelar orden" : "Cambiar estado"}
      </SubmitButton>
    </form>
  );
}
