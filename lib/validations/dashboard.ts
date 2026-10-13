import { z } from "zod";
import { WORK_ORDER_PRIORITIES } from "@/lib/domain/work-orders";
import { dateStringSchema, firstValue } from "@/lib/validations/common";
import { STATUS_FILTERS, type StatusFilter } from "@/lib/validations/work-orders";

// Dashboard filters come from the URL; invalid values are dropped, never
// trusted. The period applies to the work order's report date.
export const dashboardFiltersSchema = z.object({
  equipment: z.preprocess(firstValue, z.uuid().optional().catch(undefined)),
  status: z.preprocess(
    firstValue,
    z
      .enum(STATUS_FILTERS)
      .optional()
      .catch(undefined)
      .transform((v): StatusFilter => v ?? "all"),
  ),
  priority: z.preprocess(
    firstValue,
    z.enum(WORK_ORDER_PRIORITIES).optional().catch(undefined),
  ),
  from: z.preprocess(firstValue, dateStringSchema.optional().catch(undefined)),
  to: z.preprocess(firstValue, dateStringSchema.optional().catch(undefined)),
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
