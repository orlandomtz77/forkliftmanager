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

## `work_orders` (Fase 4 — `20261013000003_work_orders.sql`)

| Columna | Tipo | Reglas |
|---------|------|--------|
| id | uuid PK | |
| work_order_number | text | único; lo asigna el trigger: `OT-AAAA-NNNNN` (año de creación en hora de CDMX, contador por año en `work_order_counters`) |
| equipment_id | uuid | FK → `equipment(id)` (restrict), `not null`; inmutable; el equipo debe estar activo al crear |
| title | text | `not null`, máx. 120 |
| description | text | opcional, máx. 2000 |
| priority | `work_order_priority` (`low`, `medium`, `high`, `critical`) | default `medium` |
| status | `work_order_status` (`new`, `assigned`, `in_progress`, `waiting_parts`, `waiting_authorization`, `resolved`, `cancelled`) | lo controla el servidor; ver transiciones |
| reported_at | timestamptz | default `now()`; no puede estar en el futuro (tolerancia 5 min) |
| target_date | date | opcional |
| assigned_technician_id | uuid | FK → `profiles(id)` (set null); debe ser técnico activo |
| started_at / resolved_at | timestamptz | `>= reported_at`; `resolved_at >= started_at` |
| failure_cause | text | opcional, máx. 1000 |
| resolution_notes | text | opcional, máx. 2000 |
| labor_cost / parts_cost | numeric(12,2) | `not null default 0`, `>= 0` |
| created_by | uuid | FK → `profiles(id)`; lo asigna el trigger (`auth.uid()`) |
| created_at / updated_at | timestamptz | |

Checks con nombre (mapeados a mensajes en `lib/services/work-order-errors.ts`):
`work_orders_*_cost_non_negative`, `work_orders_started_after_reported`,
`work_orders_resolved_after_reported`, `work_orders_resolved_after_started`,
`work_orders_resolved_at_matches_status` (resuelta ⇔ tiene `resolved_at`),
`work_orders_assigned_requires_technician`.

Índices: `equipment_id`, `status`, `priority`, `reported_at`, `target_date`,
`assigned_technician_id`.

### Triggers y funciones

| Objeto | Comportamiento |
|--------|----------------|
| `work_orders_before_insert` | Valida equipo activo y técnico; solo admin asigna; fuerza `status` (`new`, o `assigned` si hay técnico), limpia `started_at`/`resolved_at`, asigna `created_by` y el número. |
| `work_orders_before_update` | Bloquea cambios a número, equipo y creador; un técnico solo puede cambiar estado, costos, notas, causa y fechas de trabajo; asignar técnico a una OT `new` la pasa a `assigned`; valida la transición; al pasar a `in_progress` fija `started_at` y a `resolved` fija `resolved_at` si están vacíos. |
| `work_orders_record_status` | Inserta en el historial la creación y cada cambio de estado. |
| `change_work_order_status(id, estado, nota)` | RPC (security invoker, aplica RLS) para cambiar estado con nota opcional (máx. 500). |
| `work_order_transition_allowed(desde, hacia)` | Matriz de transiciones; idéntica a `lib/domain/work-orders.ts` (lo verifica una prueba de integración). |

## `work_order_status_history` (Fase 4)

`id`, `work_order_id` (FK restrict), `previous_status` (null en la creación),
`new_status`, `changed_by` (FK → profiles), `changed_at`, `note` (máx. 500).
Solo lo escribe el trigger; los usuarios solo pueden leerlo.

## `work_order_counters` (Fase 4)

`year` PK, `last_value`. Interna: RLS sin políticas y sin grants.

## Decisiones

| Decisión | Motivo |
|----------|--------|
| Enums de Postgres | Validación en BD; el módulo TS de dominio los replica y los tipos generados verifican coincidencia. |
| Serie única case-insensitive con índice parcial | Evita duplicados `ABC123`/`abc123` y permite múltiples `NULL`. |
| `target_date` como `date` | La regla de vencimiento se evalúa contra la fecha de negocio, no una hora. |
| Sin `company_id` | Supuesto de una sola empresa (ver project brief). |
| Transiciones validadas en BD y en servidor | La BD es la autoridad (protege llamadas directas a la API); el servidor da mensajes claros. |
| Nota del cambio de estado vía RPC | El trigger lee la nota de un ajuste local a la transacción; así el historial no lo escribe el cliente. |
| `datetime-local` en hora de CDMX | Los formularios capturan fecha y hora sin zona; el servidor las interpreta en `America/Mexico_City`. |
| Código interno único sin distinguir mayúsculas | Evita `MC-01` y `mc-01` como equipos distintos; se conserva lo que escribe el usuario. |
