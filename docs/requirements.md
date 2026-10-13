# Requerimientos — Forklift Service Manager (MVP)

Estado: borrador. Los puntos marcados **[POR CONFIRMAR]** son supuestos
propuestos que el negocio debe validar.

## Requerimientos funcionales

### Autenticación y acceso (RF-AUTH)

| ID | Requerimiento | Criterios de aceptación |
|----|---------------|-------------------------|
| RF-AUTH-01 | Inicio de sesión con correo y contraseña (Supabase Auth). | Credenciales válidas → redirige a `/dashboard`. Inválidas → mensaje de error genérico. |
| RF-AUTH-02 | Las páginas operativas requieren sesión. | Usuario anónimo que visita `/dashboard`, `/equipment` o `/work-orders` es redirigido a `/login` (§12.2). |
| RF-AUTH-03 | Cerrar sesión. | Tras cerrar sesión, las páginas protegidas redirigen a `/login`. |
| RF-AUTH-04 | Sin registro público. | El signup está deshabilitado en la configuración de Supabase. |
| RF-AUTH-05 | Roles `admin` y `technician` almacenados en `profiles`. | Un usuario nuevo recibe `technician` por defecto. Solo un admin (o SQL) cambia roles. |
| RF-AUTH-06 | Usuarios desactivados (`profiles.is_active = false`) no acceden a datos. | Las políticas RLS rechazan lecturas/escrituras. |

### Catálogo de equipos (RF-EQ)

| ID | Requerimiento | Criterios de aceptación |
|----|---------------|-------------------------|
| RF-EQ-01 | Crear equipo con código interno, marca, modelo, serie opcional, horómetro opcional y estado operativo. | Admin crea y consulta el equipo (§12.3). |
| RF-EQ-02 | Código interno único. | Duplicado rechazado por BD y con mensaje claro (§12.4). |
| RF-EQ-03 | Serie única cuando existe. | Se aplica `trim`; vacío → `NULL`; unicidad sin distinguir mayúsculas. |
| RF-EQ-04 | Horómetro no negativo. | Valor < 0 rechazado en servidor y BD. |
| RF-EQ-05 | Buscar y filtrar equipos por texto, estado operativo y activo/inactivo. | Resultados coinciden con el filtro. |
| RF-EQ-06 | Desactivar en lugar de borrar. | No existe borrado físico; requiere confirmación en UI. |
| RF-EQ-07 | Estado operativo explícito. | Valores: Disponible, Rentado, En mantenimiento, Fuera de servicio **[POR CONFIRMAR]**. No se infiere de las OT. |

### Órdenes de trabajo (RF-OT)

| ID | Requerimiento | Criterios de aceptación |
|----|---------------|-------------------------|
| RF-OT-01 | Crear OT ligada a un equipo existente. | §12.5; equipo inexistente rechazado (§12.6). |
| RF-OT-02 | Número de OT legible y único `OT-AAAA-NNNNN`, generado en BD. **[POR CONFIRMAR formato]** | Sin duplicados aun con altas concurrentes. |
| RF-OT-03 | Campos: título, descripción, fecha de reporte, prioridad, estado, técnico asignado opcional, fecha objetivo, causa de falla, notas de resolución, costos de mano de obra y refacciones. | Persisten y se muestran en el detalle. |
| RF-OT-04 | Costos no negativos. | §12.7. |
| RF-OT-05 | `started_at` y `resolved_at` no anteriores a `reported_at`. | §12.7. |
| RF-OT-06 | Transiciones de estado válidas (ver matriz). | Transición inválida rechazada en servidor y BD. |
| RF-OT-07 | Una OT resuelta tiene `resolved_at`. | Constraint de BD. |
| RF-OT-08 | Las OT canceladas permanecen en BD. | Sin borrado físico. |
| RF-OT-09 | Historial de cambios de estado. | Cada cambio registra estado anterior, nuevo, usuario, fecha y nota opcional. |
| RF-OT-10 | Buscar y filtrar por equipo, estado, prioridad y rango de fechas. | Resultados coinciden con el filtro. |

#### Matriz de transiciones **[POR CONFIRMAR]**

| Desde \ Hacia | Asignada | En progreso | Esperando refacciones | Esperando autorización | Resuelta | Cancelada |
|---|---|---|---|---|---|---|
| Nueva | ✔ | ✔ | | | | ✔ |
| Asignada | | ✔ | | | | ✔ |
| En progreso | | | ✔ | ✔ | ✔ | ✔ |
| Esperando refacciones | | ✔ | | | | ✔ |
| Esperando autorización | | ✔ | | | | ✔ |
| Resuelta | — terminal (sin reapertura en el MVP) |
| Cancelada | — terminal |

Prioridades: Baja, Media, Alta, Crítica.

### Tablero (RF-DASH)

| ID | Requerimiento | Criterios de aceptación |
|----|---------------|-------------------------|
| RF-DASH-01 | Total de equipos activos. | Cuenta `is_active = true`. |
| RF-DASH-02 | Equipos fuera de servicio. | Cuenta activos con estado `out_of_service`. |
| RF-DASH-03 | OT abiertas (estado distinto de Resuelta y Cancelada). | §12.8. |
| RF-DASH-04 | OT vencidas: abiertas con fecha objetivo anterior a la fecha de negocio actual. | §12.9. Zona horaria de negocio: `America/Mexico_City` **[POR CONFIRMAR]**. |
| RF-DASH-05 | Duración de reparación (`resolved_at − started_at`); provisional para abiertas. | Solo cuando existen marcas de tiempo. |
| RF-DASH-06 | Costo registrado = mano de obra + refacciones. | §12.10. No se etiqueta como costo total. |
| RF-DASH-07 | Filtros por periodo, equipo, estado y prioridad. | KPIs recalculados con filtros. |

Disponibilidad, MTTR y MTBF quedan **fuera** hasta definir fórmula, ventana y
tratamiento de datos faltantes.

## Permisos **[POR CONFIRMAR]**

| Acción | admin | technician |
|--------|:-----:|:----------:|
| Ver equipos, OT y tablero | ✔ | ✔ |
| Crear / editar / desactivar equipos | ✔ | ✘ |
| Crear OT | ✔ | ✔ |
| Actualizar estado, costos y notas de OT | ✔ | ✔ (todas; alternativa: solo asignadas) |
| Asignar técnico | ✔ | ✘ |
| Gestionar roles | ✔ (vía SQL/Supabase en el MVP) | ✘ |
| Borrado físico | ✘ | ✘ |

## Requerimientos no funcionales

| ID | Requerimiento |
|----|---------------|
| RNF-01 | RLS habilitado con políticas explícitas en todas las tablas expuestas. |
| RNF-02 | Validación con Zod en servidor para toda entrada externa. |
| RNF-03 | TypeScript estricto; sin `any`. |
| RNF-04 | Interfaz en español, usable en escritorio y móvil, accesible por teclado; el estado no depende solo del color. |
| RNF-05 | Ningún secreto en código cliente, variables `NEXT_PUBLIC_` ni Git. |
| RNF-06 | Lint, typecheck y pruebas pasan antes de dar por terminada una funcionalidad. |
| RNF-07 | Migraciones SQL versionadas como fuente de verdad del esquema. |
