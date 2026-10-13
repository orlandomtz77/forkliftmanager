# Forklift Service Manager

MVP para gestionar montacargas y órdenes de trabajo de mantenimiento.
Stack: Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS 4 ·
Supabase (PostgreSQL, Auth, RLS) · Vitest · Playwright · Zod.

Documentación: [`docs/`](docs/) (brief, requerimientos, modelo de datos, seguridad).

## Requisitos previos

- Node.js 24+ y npm 11+
- Docker Desktop en ejecución (para Supabase local)

> El proyecto está dentro de OneDrive. Se recomienda excluir `node_modules/`
> y `.next/` de la sincronización (o mover el repo fuera de OneDrive) para
> evitar lentitud y bloqueos de archivos.

## Configuración local

```bash
npm install
npm run db:start          # levanta Supabase local (Docker) y aplica migraciones + seed
npm run db:status         # muestra URL y Publishable key locales
cp .env.example .env.local  # pega los valores de db:status
npm run dev               # http://localhost:3000
```

Usuarios **sintéticos** de desarrollo (creados por `supabase/seed.sql`, solo local):

| Correo | Contraseña | Rol |
|--------|-----------|-----|
| admin@example.test | Password123! | admin |
| technician@example.test | Password123! | technician |

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (segura solo con RLS) |

Nunca uses la `service_role`/secret key en la app ni la prefijes con `NEXT_PUBLIC_`.

## Base de datos

- Migraciones en `supabase/migrations/` (fuente de verdad del esquema).
- `npm run db:reset` — recrea la BD local y aplica migraciones + seed (**solo local**).
- `npm run db:types` — regenera `types/database.ts` tras cambios de esquema.
- Nueva migración: `npx supabase migration new <nombre>`.

## Calidad y pruebas

```bash
npm run lint
npm run typecheck
npm test                  # unitarias (Vitest)
npm run test:integration  # RLS contra Supabase local (requiere db:start y .env.local)
npx playwright install chromium   # una sola vez
npm run test:e2e          # E2E (levanta npm run dev si no está corriendo)
npm run build
```

Las pruebas de integración se niegan a correr si la URL no es local.

## Despliegue (pendiente)

1. Crear proyecto Supabase de desarrollo/preview (y otro de producción).
2. Aplicar migraciones verificando el destino: `npx supabase link` + `npx supabase db push`.
3. Configurar en Supabase *Site URL* y *Redirect URLs*; deshabilitar signup.
4. Configurar variables por entorno en Vercel (Preview y Production por separado).
5. Probar el preview antes de promover a producción.

## Estructura

```
app/(auth)/login     inicio de sesión
app/(app)/...        páginas protegidas (layout valida sesión en servidor)
app/account-inactive cuenta desactivada
components/          UI
lib/supabase/        clientes browser/server y refresco de sesión (proxy)
lib/auth/            sesión, roles, acciones de auth
lib/domain/          constantes y reglas de negocio
lib/validations/     esquemas Zod
proxy.ts             redirecciones optimistas (Next.js 16 "proxy", antes middleware)
supabase/            config, migraciones y seed
tests/               unit, integration, e2e
```
