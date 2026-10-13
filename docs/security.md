# Seguridad — Forklift Service Manager

## Autenticación

- Supabase Auth con correo y contraseña; sesiones en cookies vía `@supabase/ssr`.
- Registro público **deshabilitado** con `[auth] enable_signup = false` en
  `supabase/config.toml` (y el equivalente en el panel del proyecto remoto).
  Ojo: `[auth.email] enable_signup` debe quedar en `true`; en `false`
  desactiva el proveedor de email completo, incluido el login. Los usuarios se
  crean desde el panel de Supabase o con la CLI.
- El proxy/middleware de Next.js refresca la sesión y redirige a `/login` a
  usuarios anónimos en rutas protegidas. Esto es una comodidad de UX: la
  autorización real ocurre en servidor (layouts, server actions) y en RLS.
- En servidor se usa `supabase.auth.getClaims()`/`getUser()` (valida el JWT),
  nunca `getSession()` como fuente de confianza.

## Roles

| Rol | Descripción |
|-----|-------------|
| `admin` | Gestiona equipos, OT y técnicos asignados. |
| `technician` | Lee todo; crea OT y actualiza su estado, costos y notas. |

El rol vive en `public.profiles.role`. La función `public.current_app_role()`
(`security definer`, `search_path` vacío, `stable`) devuelve el rol del usuario
actual solo si su perfil está activo; las políticas la usan para evitar
recursión de RLS. Los usuarios **no** pueden cambiar su propio rol: no existe
política `update` de `profiles` para usuarios no-admin y las columnas `role` e
`is_active` solo las modifica un admin.

## Políticas RLS

Todas las tablas de `public` tienen RLS habilitado. Sin política = denegado.

### `profiles`

| Operación | Quién |
|-----------|-------|
| select | Usuarios autenticados con perfil activo (para mostrar nombres de técnicos). |
| insert | Nadie vía API (lo hace el trigger `handle_new_user`). |
| update | Solo `admin`. |
| delete | Nadie (cascade desde `auth.users`). |

### `equipment`

| Operación | Quién |
|-----------|-------|
| select | Usuarios autenticados con perfil activo. |
| insert | Solo `admin`. |
| update | Solo `admin` (incluye desactivar/reactivar). |
| delete | Nadie (se desactiva, no se borra). |

Las server actions de equipos llaman además a `requireRole("admin")` y validan
la entrada con Zod antes de escribir. La búsqueda de texto se sanea
(`sanitizeSearch`) porque se usa dentro de un filtro `or` de PostgREST.

### `work_orders`, `work_order_status_history`

Se documentarán al implementarse (Fase 4). Regla confirmada: el técnico solo
actualiza OT asignadas a él.

## Grants

- El rol `anon` no tiene privilegios sobre tablas de `public`.
- El rol `authenticated` recibe solo los privilegios necesarios; RLS filtra filas.

## Variables de entorno y secretos

| Variable | Ámbito |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública (segura solo con RLS correcto) |

- La clave `service_role` / secret **no** se usa en la app. Si alguna vez se
  necesita, solo en servidor y sin prefijo `NEXT_PUBLIC_`.
- `.env.local` está en `.gitignore`. `.env.example` solo contiene placeholders.

## Reglas operativas

- No desplegar con políticas permisivas temporales.
- No usar datos reales hasta que pasen las pruebas de autenticación, RLS y
  control de acceso.
- Pruebas destructivas solo contra Supabase local.
- Revisar los *advisors* de seguridad de Supabase antes de cada despliegue.
