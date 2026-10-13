import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Ingresa tu correo." })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Ingresa un correo válido." })),
  password: z
    .string({ error: "Ingresa tu contraseña." })
    .min(1, { error: "Ingresa tu contraseña." })
    .max(128, { error: "La contraseña es demasiado larga." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
