"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EquipmentFormState } from "@/app/(app)/equipment/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
} from "@/lib/domain/equipment";

export type EquipmentFormDefaults = {
  asset_code: string;
  serial_number: string;
  brand: string;
  model: string;
  hour_meter: string;
  operational_status: string;
};

type EquipmentFormProps = {
  action: (
    state: EquipmentFormState,
    formData: FormData,
  ) => Promise<EquipmentFormState>;
  defaults: EquipmentFormDefaults;
  submitLabel: string;
  cancelHref: string;
};

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 aria-[invalid=true]:border-red-500";

export function EquipmentForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: EquipmentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaults, ...state.values };
  const errors = state.fieldErrors ?? {};

  function fieldProps(name: keyof EquipmentFormDefaults) {
    const error = errors[name];
    return {
      id: name,
      name,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${name}-error` : undefined,
    };
  }

  function fieldError(name: keyof EquipmentFormDefaults) {
    const error = errors[name];
    return error ? (
      <p id={`${name}-error`} className="text-sm text-red-700">
        {error}
      </p>
    ) : null;
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          Identificación
        </legend>
        <div className="space-y-1">
          <label htmlFor="asset_code" className="block text-sm font-medium">
            Código interno <span aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps("asset_code")}
            required
            maxLength={40}
            defaultValue={values.asset_code}
            className={inputClassName}
          />
          {fieldError("asset_code")}
        </div>
        <div className="space-y-1">
          <label htmlFor="serial_number" className="block text-sm font-medium">
            Número de serie
          </label>
          <input
            {...fieldProps("serial_number")}
            maxLength={60}
            defaultValue={values.serial_number}
            className={inputClassName}
          />
          {fieldError("serial_number")}
        </div>
        <div className="space-y-1">
          <label htmlFor="brand" className="block text-sm font-medium">
            Marca <span aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps("brand")}
            required
            maxLength={60}
            defaultValue={values.brand}
            className={inputClassName}
          />
          {fieldError("brand")}
        </div>
        <div className="space-y-1">
          <label htmlFor="model" className="block text-sm font-medium">
            Modelo <span aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps("model")}
            required
            maxLength={60}
            defaultValue={values.model}
            className={inputClassName}
          />
          {fieldError("model")}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          Operación
        </legend>
        <div className="space-y-1">
          <label
            htmlFor="operational_status"
            className="block text-sm font-medium"
          >
            Estado operativo <span aria-hidden="true">*</span>
          </label>
          <select
            {...fieldProps("operational_status")}
            required
            defaultValue={values.operational_status}
            className={inputClassName}
          >
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EQUIPMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {fieldError("operational_status")}
        </div>
        <div className="space-y-1">
          <label htmlFor="hour_meter" className="block text-sm font-medium">
            Horómetro (horas)
          </label>
          <input
            {...fieldProps("hour_meter")}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            defaultValue={values.hour_meter}
            className={inputClassName}
          />
          {fieldError("hour_meter")}
        </div>
      </fieldset>

      <div aria-live="polite">
        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingText="Guardando…">{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
