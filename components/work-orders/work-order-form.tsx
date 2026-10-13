"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { WorkOrderFormState } from "@/app/(app)/work-orders/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  FormField,
  FormMessage,
  fieldA11y,
  inputClassName,
} from "@/components/ui/form-field";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
} from "@/lib/domain/work-orders";

export type WorkOrderFormDefaults = Record<string, string>;

type Option = { value: string; label: string };

type WorkOrderFormProps = {
  action: (
    state: WorkOrderFormState,
    formData: FormData,
  ) => Promise<WorkOrderFormState>;
  defaults: WorkOrderFormDefaults;
  submitLabel: string;
  cancelHref: string;
  /** Present only when creating: the equipment select. */
  equipmentOptions?: Option[];
  /** Present only for admins: the technician select. */
  technicianOptions?: Option[];
  /** Title, description, priority, dates (create, or admin edit). */
  showGeneralFields: boolean;
  /** Costs, notes and work timestamps (edit only). */
  showWorkFields: boolean;
  /** The resolution timestamp only applies to resolved orders. */
  showResolvedAt?: boolean;
};

export function WorkOrderForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
  equipmentOptions,
  technicianOptions,
  showGeneralFields,
  showWorkFields,
  showResolvedAt = false,
}: WorkOrderFormProps) {
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaults, ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {showGeneralFields ? (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Reporte</legend>

          {equipmentOptions ? (
            <FormField
              label="Equipo"
              htmlFor="equipment_id"
              required
              error={errors.equipment_id}
              className="sm:col-span-2"
            >
              <select
                {...fieldA11y("equipment_id", errors.equipment_id)}
                required
                defaultValue={values.equipment_id}
                className={inputClassName}
              >
                <option value="">Selecciona un equipo</option>
                {equipmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          <FormField
            label="Título"
            htmlFor="title"
            required
            error={errors.title}
            className="sm:col-span-2"
          >
            <input
              {...fieldA11y("title", errors.title)}
              required
              maxLength={120}
              defaultValue={values.title}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Descripción"
            htmlFor="description"
            error={errors.description}
            className="sm:col-span-2"
          >
            <textarea
              {...fieldA11y("description", errors.description)}
              rows={3}
              maxLength={2000}
              defaultValue={values.description}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Prioridad" htmlFor="priority" required error={errors.priority}>
            <select
              {...fieldA11y("priority", errors.priority)}
              required
              defaultValue={values.priority}
              className={inputClassName}
            >
              {WORK_ORDER_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {WORK_ORDER_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Fecha y hora de reporte"
            htmlFor="reported_at"
            required={!equipmentOptions}
            error={errors.reported_at}
            hint={equipmentOptions ? "Vacío = ahora. Hora de Ciudad de México." : "Hora de Ciudad de México."}
          >
            <input
              {...fieldA11y("reported_at", errors.reported_at, true)}
              type="datetime-local"
              defaultValue={values.reported_at}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Fecha objetivo" htmlFor="target_date" error={errors.target_date}>
            <input
              {...fieldA11y("target_date", errors.target_date)}
              type="date"
              defaultValue={values.target_date}
              className={inputClassName}
            />
          </FormField>

          {technicianOptions ? (
            <FormField
              label="Técnico asignado"
              htmlFor="assigned_technician_id"
              error={errors.assigned_technician_id}
            >
              <select
                {...fieldA11y("assigned_technician_id", errors.assigned_technician_id)}
                defaultValue={values.assigned_technician_id}
                className={inputClassName}
              >
                <option value="">Sin asignar</option>
                {technicianOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          {equipmentOptions ? (
            <FormField
              label="Causa de la falla (si se conoce)"
              htmlFor="failure_cause"
              error={errors.failure_cause}
              className="sm:col-span-2"
            >
              <textarea
                {...fieldA11y("failure_cause", errors.failure_cause)}
                rows={2}
                maxLength={1000}
                defaultValue={values.failure_cause}
                className={inputClassName}
              />
            </FormField>
          ) : null}
        </fieldset>
      ) : null}

      {showWorkFields ? (
        <>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Trabajo realizado</legend>
            <FormField
              label="Inicio de reparación"
              htmlFor="started_at"
              error={errors.started_at}
              hint="Hora de Ciudad de México."
            >
              <input
                {...fieldA11y("started_at", errors.started_at, true)}
                type="datetime-local"
                defaultValue={values.started_at}
                className={inputClassName}
              />
            </FormField>
            {showResolvedAt ? (
              <FormField
                label="Resolución"
                htmlFor="resolved_at"
                required
                error={errors.resolved_at}
                hint="Hora de Ciudad de México."
              >
                <input
                  {...fieldA11y("resolved_at", errors.resolved_at, true)}
                  type="datetime-local"
                  defaultValue={values.resolved_at}
                  className={inputClassName}
                />
              </FormField>
            ) : null}
            <FormField
              label="Causa de la falla"
              htmlFor="failure_cause"
              error={errors.failure_cause}
              className="sm:col-span-2"
            >
              <textarea
                {...fieldA11y("failure_cause", errors.failure_cause)}
                rows={2}
                maxLength={1000}
                defaultValue={values.failure_cause}
                className={inputClassName}
              />
            </FormField>
            <FormField
              label="Notas de resolución"
              htmlFor="resolution_notes"
              error={errors.resolution_notes}
              className="sm:col-span-2"
            >
              <textarea
                {...fieldA11y("resolution_notes", errors.resolution_notes)}
                rows={3}
                maxLength={2000}
                defaultValue={values.resolution_notes}
                className={inputClassName}
              />
            </FormField>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Costos registrados (MXN)</legend>
            <FormField label="Mano de obra" htmlFor="labor_cost" error={errors.labor_cost}>
              <input
                {...fieldA11y("labor_cost", errors.labor_cost)}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                defaultValue={values.labor_cost}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Refacciones" htmlFor="parts_cost" error={errors.parts_cost}>
              <input
                {...fieldA11y("parts_cost", errors.parts_cost)}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                defaultValue={values.parts_cost}
                className={inputClassName}
              />
            </FormField>
          </fieldset>
        </>
      ) : null}

      <FormMessage error={state.error} />

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
