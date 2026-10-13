export const APP_ROLES = ["admin", "technician"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  technician: "Técnico",
};
