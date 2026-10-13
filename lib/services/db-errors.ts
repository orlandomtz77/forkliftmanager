/** Postgres error codes surfaced by PostgREST. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";

export type DbError = {
  code?: string;
  message: string;
  details?: string | null;
};

export type FieldErrors = Partial<Record<string, string>>;

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * Maps a unique-violation on a known index to a field error.
 * PostgREST includes the constraint/index name in `message`.
 */
export function uniqueViolationField(
  error: DbError,
  indexToField: Record<string, string>,
): string | null {
  if (error.code !== PG_UNIQUE_VIOLATION) return null;
  const text = `${error.message} ${error.details ?? ""}`;
  for (const [index, field] of Object.entries(indexToField)) {
    if (text.includes(index)) return field;
  }
  return null;
}
