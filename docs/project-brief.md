# Project Brief — Forklift Service Manager

## Problema

La empresa renta montacargas y da servicio de mantenimiento. Hoy la información
de equipos y órdenes de trabajo (OT) está dispersa, lo que impide responder con
rapidez:

- ¿Qué montacargas están fuera de servicio?
- ¿Qué OT están abiertas o vencidas?
- ¿Qué bloquea una reparación?
- ¿Cuánto tiempo lleva parado un equipo?
- ¿Cuál es el costo registrado de cada reparación?
- ¿Qué trabajos requieren seguimiento?

## Objetivos del MVP

1. Centralizar el catálogo de montacargas.
2. Registrar y dar seguimiento a OT con un flujo de estados validado.
3. Mostrar un tablero operativo con indicadores calculados a partir de los
   registros almacenados.
4. Proteger toda la información detrás de autenticación y RLS.

## Alcance

Ver `CLAUDE.md` §4 y `docs/requirements.md`. Fuera de alcance: facturación,
inventario, portal de clientes, notificaciones, integraciones, IA, SSO.

## Supuestos explícitos

- **Una sola empresa.** No hay multi-tenant; no existe `company_id`. Si en el
  futuro se requieren varias empresas, se debe implementar aislamiento por
  tenant **antes** de almacenar datos reales de más de una.
- **Dos roles:** `admin` y `technician` (ver `docs/security.md`).
- **Sin registro público.** Los usuarios se dan de alta desde Supabase.
- Interfaz en español.

## Resultados esperados

- El equipo de operaciones puede consultar el estado de la flota y las OT
  pendientes en un solo lugar.
- Los costos registrados (mano de obra + refacciones) por OT son trazables.
- Base técnica segura y verificable para iterar después de validar el MVP.
