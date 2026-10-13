import { z } from "zod";

export const idSchema = z.uuid({ error: "Identificador inválido." });

/** Empty form fields become null. */
export const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** Repeated query params arrive as arrays; keep the first value. */
export const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Ingresa ${label}.` })
    .trim()
    .min(1, { error: `Ingresa ${label}.` })
    .max(max, { error: `Máximo ${max} caracteres.` });

export const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, { error: `Máximo ${max} caracteres.` }).nullable(),
  );

/**
 * Search text is used inside a PostgREST `or` filter, so characters with
 * meaning in that syntax (commas, parentheses, wildcards, quotes) are removed.
 */
export function sanitizeSearch(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s\-./#]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export const searchParamSchema = z.preprocess(
  firstValue,
  z.string().optional().transform((v) => sanitizeSearch(v ?? "")),
);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Calendar date "YYYY-MM-DD" (no time zone). */
export const dateStringSchema = z
  .string()
  .refine(isValidDateString, { error: "Ingresa una fecha válida." });
