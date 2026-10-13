# Modelo de datos — Forklift Service Manager

Estado: borrador. Las tablas se implementan por fases mediante migraciones en
`supabase/migrations/`. Las marcadas *(pendiente)* aún no existen.

## Convenciones

- PK `uuid` con `gen_random_uuid()`.
- Marcas de tiempo `timestamptz`; `created_at`/`updated_at` mantenidos por BD
  (trigger `set_updated_at`).
- Montos `numeric(12,2)`, nunca flotantes.
- Valores enumerados como tipos `enum` de Postgres, reflejados en TypeScript
  desde un único módulo de dominio.
- Sin borrado físico de registros operativos.
- **Una sola empresa:** no hay `company_id`.

## Diagrama

```
auth.users 1─1 profiles
equipment 1─N work_orders N─1 profiles (assigned_technician_id)
work_orders 1─N work_order_status_history N─1 profiles (changed_by)
```

## `profiles` (Fase 2)

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | FK → `auth.users(id)` on delete cascade |
| full_name | text | opcional |
| role | `app_role` (`admin`, `technician`) | default `technician` |
| is_active | boolean | default `true` |
| created_at / updated_at | timestamptz | default `now()` |

Se crea automáticamente con un trigger `after insert on auth.users`.

## `equipment` (Fase 3 — `20261013000002_equipment.sql`)

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | |
| asset_code | text | `not null`, `trim`, no vacío, máx. 40; único sin distinguir mayúsculas (índice sobre `lower(asset_code)`) |
| serial_number | text | opcional, máx. 60; vacío → `NULL`; único sin distinguir mayúsculas (índice parcial sobre `lower(serial_number)`) |
| brand | text | `not null`, `trim`, máx. 60 |
| model | text | `not null`, `trim`, máx. 60 |
| hour_meter | numeric(10,1) | opcional, `>= 0`; se redondea a 1 decimal |
| operational_status | `equipment_status` (`available`, `rented`, `in_maintenance`, `out_of_service`) | `not null`, default `available` |
| is_active | boolean | default `true` |
| created_at / updated_at | timestamptz | |

Índices: `operational_status`, `is_active`.

La normalización (`trim`, serie vacía → `NULL`) la hace el trigger
`normalize_equipment`, así aplica también a llamadas directas a la API.

## `work_orders` *(pendiente — Fase 4)*

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | |
| work_order_number | text | único, generado `OT-AAAA-NNNNN` |
| equipment_id | uuid | FK → `equipment(id)`, `not null` |
| title | text | `not null` |
| description | text | opcional |
| priority | `work_order_priority` (`low`, `medium`, `high`, `critical`) | `not null` |
| status | `work_order_status` (`new`, `assigned`, `in_progress`, `waiting_parts`, `waiting_authorization`, `resolved`, `cancelled`) | default `new` |
| reported_at | timestamptz | `not null`, default `now()` |
| target_date | date | opcional |
| assigned_technician_id | uuid | FK → `profiles(id)`, opcional |
| started_at / resolved_at | timestamptz | `>= reported_at` |
| failure_cause / resolution_notes | text | opcional |
| labor_cost / parts_cost | numeric(12,2) | `not null default 0`, `>= 0` |
| created_at / updated_at | timestamptz | |

Checks: `status = 'resolved' ⇒ resolved_at is not null`. Las transiciones se
validan con un trigger. Índices: `equipment_id`, `status`, `priority`,
`reported_at`, `target_date`.

## `work_order_status_history` *(pendiente — Fase 4)*

`id`, `work_order_id` (FK), `previous_status` (nullable), `new_status`,
`changed_by` (FK → profiles), `changed_at`, `note`. Escrito por trigger; sin
update/delete para usuarios.

## Decisiones

| Decisión | Motivo |
|----------|--------|
| Enums de Postgres | Validación en BD; el módulo TS de dominio los replica y los tipos generados verifican coincidencia. |
| Serie única case-insensitive con índice parcial | Evita duplicados `ABC123`/`abc123` y permite múltiples `NULL`. |
| `target_date` como `date` | La regla de vencimiento se evalúa contra la fecha de negocio, no una hora. |
| Sin `company_id` | Supuesto de una sola empresa (ver project brief). |
| Código interno único sin distinguir mayúsculas | Evita `MC-01` y `mc-01` como equipos distintos; se conserva lo que escribe el usuario. |
