# CLAUDE.md --- Forklift Service Manager

## 1. Project Purpose

**Forklift Service Manager** is a web application MVP for a company that
rents forklifts and provides maintenance services.

The MVP centralizes forklift records and maintenance work orders so the
team can answer:

-   Which forklifts are out of service?
-   Which work orders are open or overdue?
-   What is blocking a repair?
-   How long has equipment been down?
-   What are the recorded costs of each repair?
-   Which maintenance jobs need follow-up?

Build a small, secure, verifiable product. Do not turn the MVP into a
full ERP or add complexity without a validated business need.

## 2. Required Technology Stack

Use this stack unless an explicit project decision changes it:

-   **Next.js** with the App Router
-   **TypeScript** with strict type checking
-   **React**
-   **Tailwind CSS** for styling
-   **Supabase PostgreSQL** for persistence
-   **Supabase Auth** for authentication
-   **Supabase Row Level Security (RLS)** for database access control
-   **Vercel** for hosting and deployments
-   **Vitest** for unit tests
-   **Playwright** for critical end-to-end tests
-   **Zod** or an equivalent established validation library for
    validating untrusted inputs

Use the current stable versions compatible with each other. Follow
current official documentation for Next.js, Supabase, and Vercel rather
than relying on outdated examples.

Do not use Streamlit, SQLite, or a separate Python backend for this MVP.
Business logic should live in typed TypeScript modules and appropriate
server-side Next.js code. Python may be used later for separate
analytics or data-processing jobs if a validated requirement justifies
it.

## 3. Claude Code's Role

Act as a senior full-stack developer, systems analyst, and technical
reviewer.

Before changing code:

1.  Inspect the repository structure and existing files.
2.  Read this document and relevant documentation under `docs/`.
3.  Identify the requirements affected by the change.
4.  Call out undefined business rules instead of silently inventing
    them.
5.  Present a brief implementation plan before broad or potentially
    destructive changes.
6.  Prefer small, reversible increments.

After completing a task:

-   Summarize what changed and why.
-   List the affected files.
-   Run relevant linting, type checks, and tests.
-   Report actual test results; never claim a command ran if it did not.
-   Identify assumptions, limitations, and manual steps still required.

## 4. MVP Scope

### In Scope

#### 4.1 Forklift catalog

Users with appropriate permissions can:

-   Create, view, and update equipment records.
-   Store an internal asset code, make, model, optional serial number,
    optional hour meter, and operational status.
-   Search and filter equipment.
-   Deactivate equipment rather than physically deleting records with
    operational history.
-   Avoid duplicate internal asset codes and duplicate serial numbers
    when provided.

#### 4.2 Work orders

Users with appropriate permissions can:

-   Create a work order linked to an existing forklift.
-   Record a title, description, report date, priority, status, optional
    assigned technician, target date, failure cause, and notes.
-   Record start and resolution timestamps when applicable.
-   Record labor and parts costs.
-   Search and filter work orders by equipment, status, priority, and
    date range.
-   View work-order details and update a work order through valid status
    transitions.
-   Preserve important status history where feasible in the MVP.

#### 4.3 Work-order statuses

Initial suggested statuses:

-   `New`
-   `Assigned`
-   `In Progress`
-   `Waiting for Parts`
-   `Waiting for Authorization`
-   `Resolved`
-   `Cancelled`

Centralize allowed statuses and validate transitions. Do not scatter
arbitrary status strings throughout the codebase.

A resolved work order must have a resolution timestamp. A cancelled work
order must remain in the database for basic traceability.

#### 4.4 Operations dashboard

Display, at minimum:

-   Total active equipment.
-   Equipment marked out of service.
-   Open work orders.
-   Overdue work orders when a target date exists.
-   Repair duration where timestamps allow it.
-   Recorded repair costs.
-   Useful filters for period, equipment, status, and priority.

#### 4.5 Authentication and access

-   Require authentication for operational pages.
-   Provide a simple sign-in flow using Supabase Auth.
-   Do not allow public users to read or modify operational records.
-   Use RLS policies on every exposed table.
-   Define a minimal role model only if the project needs it. Do not
    create elaborate enterprise permissions without a requirement.
-   If the MVP is for one company, make that assumption explicit. If
    multiple companies or tenants are required, implement tenant
    isolation before storing real data.

### Out of Scope for Now

Do not implement without explicit approval:

-   Full contract, billing, invoicing, or accounts receivable
    management.
-   Comprehensive inventory, purchase orders, or supplier management.
-   Customer portal or native mobile application.
-   Enterprise SSO or complex role administration.
-   ERP, SAP, telemetry, or third-party integrations.
-   WhatsApp, SMS, or email notifications.
-   AI or predictive maintenance models.
-   Microservices or a separate backend service.
-   Complex approval workflows.

These can be evaluated after the MVP has been validated.

## 5. Architecture

Keep the presentation, business logic, and data access clearly
separated.

Suggested structure:

``` text
forklift-service-manager/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── equipment/
│   │   └── work-orders/
│   ├── auth/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── equipment/
│   ├── work-orders/
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── validations/
│   ├── services/
│   └── utils/
├── types/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── project-brief.md
│   ├── requirements.md
│   ├── data-model.md
│   └── security.md
├── public/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── CLAUDE.md
```

This is a suggested structure, not a reason to reorganize an existing
repository unnecessarily. Inspect the project first and preserve useful
conventions.

### Architecture rules

-   Use Server Components by default; use Client Components only when
    interactivity requires them.
-   Use the official `@supabase/ssr` approach for Supabase Auth with
    Next.js server-side rendering and cookies.
-   Create separate, correctly configured Supabase browser and server
    clients.
-   Never trust client-side checks as the sole authorization mechanism.
-   Keep database access and business rules out of presentation
    components where practical.
-   Use server-side code for operations that require trusted server
    execution.
-   Generate or maintain TypeScript database types from the Supabase
    schema when feasible.
-   Use Supabase SQL migrations as the source of truth for schema
    changes.
-   Do not edit production database structure manually without recording
    the change in a migration.

## 6. Data Model

Design and document the schema in `docs/data-model.md` before treating
it as final.

### 6.1 Equipment

Suggested fields:

-   `id` --- UUID primary key.
-   `asset_code` --- unique internal identifier.
-   `serial_number` --- optional, unique when present.
-   `brand`
-   `model`
-   `hour_meter` --- optional, non-negative numeric value.
-   `operational_status`
-   `created_at`
-   `updated_at`
-   `is_active`

### 6.2 Work orders

Suggested fields:

-   `id` --- UUID primary key.
-   `work_order_number` --- unique, human-readable identifier.
-   `equipment_id` --- foreign key to equipment.
-   `title`
-   `description`
-   `priority`
-   `status`
-   `reported_at`
-   `target_date` --- optional.
-   `assigned_technician_id` --- optional, if a technician/profile table
    is implemented.
-   `started_at` --- optional.
-   `resolved_at` --- optional.
-   `failure_cause` --- optional.
-   `resolution_notes` --- optional.
-   `labor_cost` --- non-negative numeric amount.
-   `parts_cost` --- non-negative numeric amount.
-   `created_at`
-   `updated_at`

### 6.3 Profiles and status history

Use a profile table linked to `auth.users` if application-specific user
information or roles are required. Do not expose authentication secrets.

Consider a `work_order_status_history` table containing the work order,
previous status, new status, changed-by user, timestamp, and optional
note. Use it if the implementation needs a reliable audit trail.

### Data rules

-   Use UUIDs for primary keys unless a documented reason requires
    otherwise.
-   Use foreign keys and appropriate database constraints.
-   Use `timestamptz` for timestamps.
-   Use `numeric` for monetary amounts, not floating-point types.
-   Define allowed statuses and priorities consistently.
-   Add indexes for common filtering and join columns.
-   Decide explicitly whether serial numbers are unique and how blank
    values are normalized.
-   If multiple companies or tenants are supported, add a tenant/company
    identifier and enforce isolation through RLS policies for every
    relevant table.
-   Document all schema decisions in `docs/data-model.md`.

## 7. Business Rules and KPI Definitions

-   Equipment must exist before a work order can be created.
-   Asset codes and work-order numbers must be unique.
-   Costs cannot be negative.
-   Start and resolution timestamps must not precede the report
    timestamp.
-   Resolved and cancelled work orders are not open work orders.
-   A work order is overdue only if it has a target date earlier than
    the current business date and is still open.
-   `Waiting for Parts` does not mean the equipment is operational.
-   Do not infer that equipment is available merely because it has no
    open work order. Equipment status must be maintained by an explicit
    business rule or user action.
-   Use database constraints and server-side validation for critical
    rules. Client-side validation is only a usability feature.
-   Calculate metrics from stored records rather than duplicating totals
    that can become stale.

### KPI definitions

**Open work orders:** work orders whose status is neither `Resolved` nor
`Cancelled`.

**Overdue work orders:** open work orders with a target date before the
current business date.

**Repair duration:** elapsed time between `started_at` and
`resolved_at`. For an open order, elapsed time since start may be
displayed as provisional.

**Downtime:** calculate only when reliable timestamps or records
identify when equipment became unavailable and when it returned to
service. Document approximations.

**Recorded cost per work order:** recorded labor cost plus recorded
parts cost. Do not label it as total business cost if other cost
categories are missing.

**Availability, MTTR, and MTBF:** define the formula, time window,
equipment population, and treatment of missing data before showing these
KPIs. Do not invent values when the available data is insufficient.

## 8. Security Requirements

Security is part of the MVP, not a future enhancement.

-   Enable RLS on all tables exposed through the Supabase Data API.
-   Create explicit RLS policies for the intended users and operations.
-   Deny access by default where appropriate.
-   Require a valid authenticated session for protected pages and server
    actions.
-   Verify the user and authorization on the server for sensitive
    mutations.
-   Never expose the Supabase `service_role` key or any secret in
    browser code, `NEXT_PUBLIC_` variables, source control, or logs.
-   The publishable key may be used in the client only with properly
    configured RLS and grants.
-   Do not treat a hidden UI button as an authorization control.
-   Validate all external input with Zod or equivalent validation on the
    server.
-   Use safe database operations and avoid constructing raw SQL from
    user input.
-   Keep `.env.local` and secret files out of Git.
-   Document access policies and security assumptions in
    `docs/security.md`.
-   Do not deploy with permissive temporary RLS policies.
-   Do not expose the application publicly with real operational data
    until authentication, RLS, and access-control tests pass.

## 9. Environment Variables and Deployment

Use environment variables rather than hardcoding credentials.

Expected local variables:

``` bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Only add server-only secrets if a specific approved feature requires
them. Never prefix a secret with `NEXT_PUBLIC_`.

Requirements:

-   Commit `.env.example` with placeholders only.
-   Never commit `.env.local` or real credentials.
-   Configure local, preview, and production environment variables
    separately in Vercel.
-   Use separate Supabase projects for development and production when
    feasible.
-   Apply database migrations deliberately and verify the target
    environment before applying them.
-   Configure the production site URL and allowed authentication
    redirect URLs in Supabase.
-   Test the deployed preview before promoting to production.
-   Do not claim deployment is complete unless it has actually been
    performed and verified.

## 10. UI and UX Requirements

-   The user-facing interface should be in Spanish unless explicitly
    changed.
-   Use clear labels that maintenance and operations staff understand.
-   Make common tasks easy: finding equipment, reporting a failure,
    updating an order, and reviewing pending work.
-   Use consistent status and priority labels.
-   Provide loading, empty, success, and error states.
-   Confirm destructive actions.
-   Do not rely on color alone to communicate status.
-   Make layouts usable on desktop and mobile browsers.
-   Avoid excessively long forms; group related fields.
-   Do not present seed or mock data as real business data.
-   Use accessible form labels and keyboard-friendly controls.
-   Prefer simple, consistent components over unnecessary visual
    complexity.

## 11. Code Quality

-   Use TypeScript strict mode.
-   Avoid `any`; use precise types and validate external data.
-   Follow the existing linting and formatting conventions.
-   Keep functions small and focused.
-   Avoid duplicating business rules.
-   Handle loading, error, and empty states.
-   Do not silently swallow exceptions.
-   Do not log secrets, access tokens, or unnecessary personal data.
-   Avoid dependencies and abstractions without a concrete need.
-   Do not modify unrelated files.
-   Do not run destructive database changes without explicit approval.
-   Update generated database types when schema changes require it.
-   Keep documentation aligned with the actual implementation.

## 12. Testing and Acceptance Criteria

At minimum, test the following:

1.  An authenticated user can view the dashboard.
2.  An unauthenticated user cannot access protected operational pages or
    data.
3.  Authorized users can create and retrieve equipment.
4.  Duplicate asset codes are rejected.
5.  Authorized users can create a work order for existing equipment.
6.  A work order cannot reference nonexistent equipment.
7.  Negative costs and invalid dates are rejected.
8.  Open and closed work orders are counted correctly.
9.  An overdue work order is identified only when it remains open and
    has an expired target date.
10. Recorded costs match the stored labor and parts amounts.
11. RLS prevents unauthorized reads and writes.
12. A user cannot bypass permissions by calling server actions or APIs
    directly.
13. The main flows work in a production-like preview deployment.
14. The app passes linting, TypeScript checks, and relevant automated
    tests.

Use a dedicated test setup and synthetic data. Do not run destructive
tests against production.

## 13. Recommended Development Workflow

For each feature:

1.  Read the relevant requirement in `docs/requirements.md`.
2.  Define acceptance criteria.
3.  Review the database model and security impact.
4.  Add or update a Supabase migration if the schema changes.
5.  Implement server-side validation and authorization.
6.  Implement the data-access and business logic.
7.  Build the UI.
8.  Add unit, integration, or end-to-end tests as appropriate.
9.  Run linting, type checks, and tests.
10. Update documentation and report what changed.

Implement one complete vertical feature at a time. Avoid building all
screens with mock data and postponing database integration and security
until the end.

## 14. Definition of Done

A feature is complete when:

-   It meets its acceptance criteria.
-   Input is validated on the server.
-   Authentication and authorization are enforced where required.
-   RLS policies protect database records.
-   Data persists correctly in Supabase.
-   Relevant tests pass.
-   Existing functionality remains intact.
-   Documentation and database migrations are up to date.
-   Assumptions and limitations are documented.

## 15. Initial Project Deliverables

Create or verify these documents before expanding implementation:

1.  `docs/project-brief.md` --- problem, goals, scope, and expected
    outcomes.
2.  `docs/requirements.md` --- functional and non-functional
    requirements with IDs and acceptance criteria.
3.  `docs/data-model.md` --- entities, relationships, constraints, and
    data definitions.
4.  `docs/security.md` --- authentication, RLS policies, roles, and
    environment assumptions.
5.  `README.md` --- prerequisites, local setup, environment variables,
    migrations, tests, and deployment steps.

## 16. Recommended First Task for Claude Code

Inspect the existing repository and compare it with this document. Do
not implement all features immediately.

First report:

-   The current repository structure.
-   Existing documentation and components.
-   Missing or conflicting requirements.
-   Required Supabase tables, relationships, and RLS policies.
-   A prioritized plan for building the MVP.
-   Commands for installing dependencies, running locally, linting, type
    checking, and testing based on the actual project.

Then implement the MVP in small, verifiable increments. Start with the
project setup and secure Supabase integration, followed by the equipment
catalog and work-order workflow.
