# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **Admin/gestor** — the manager who creates and assigns shifts, manages the worker roster (cargo, departamento, rol), configures shift-type labels and the cargos list, sets up notifications, and publishes the mural (announcements + polls). Design decisions prioritize the admin's efficiency and control.

Secondary: **Trabajador** — views personal shifts, confirms (confirmado) or marks done (cumplido), and reads the mural. Interface must stay clear and fast for them, but they are not the primary design driver.

## Product Purpose

"Diario de Turnos" (Diario mural de turnos trabajadores): a web app that lets an organization plan, assign, and communicate work shifts. Admins manage a worker roster and shift calendar; workers self-serve their schedule and acknowledge assignments. The goal is to cut scheduling friction and keep the whole team informed through the mural and email notifications.

## Positioning

A focused, Spanish-language shift-management and internal-comms tool for teams that rotate shifts (healthcare, retail, logistics, etc.). Its defensible difference versus a generic calendar: a worker confirmation flow, configurable shift types and cargos, a built-in mural (announcements + polls), and automated email notifications (assignment + morning reminder) at zero marginal cost to the admin.

## Operating Context

- Used by organizations with rotating shifts.
- Admin works from a desktop panel; workers from a lightweight dashboard.
- Notifications: email via a configurable SMTP server (no per-message cost to the admin using a free-tier provider). A morning reminder runs through an external cron that calls `POST /api/cron/morning-reminder` with a `x-cron-secret` header.
- Bulk worker import via CSV/XLSX, with cargo / departamento / rol as preselected dropdowns.
- Runs on Next.js; production targets Dokploy/Postgres, local dev uses SQLite.

## Capabilities and Constraints

- Roles: `admin`, `worker`. Workers cannot change their own role, active flag, or cargo.
- A Shift has: `userId`, `date`, `start`, `end`, `type` (manana/tarde/noche/completo/otro, labels configurable), `status` (asignado/confirmado/cumplido), optional `name`, `notes`.
- Configurable lists live in DB `Setting` rows: `shiftTypeLabels`, `cargos`, `emailNotifications` (assignment + morning templates), `smtp`, `cronSecret`.
- **Intended SaaS multi-empresa (confirmed):** future work must isolate tenant data. The current implementation is single-organization and has no tenant scoping yet — record this as a known gap to close before multi-customer launch.
- Stack (inferred from repo, confirm if wrong): Next.js App Router + TypeScript + Tailwind + Prisma; Postgres for production (Dokploy), SQLite for local dev.

## Brand Commitments

A defined brand exists (logo, colors, visual identity) per the owner; specifics to be provided. Preserve and apply them once supplied. Current working name: "Diario de Turnos". Interface language: Spanish (confirmed).

## Evidence on Hand

- Running codebase at the project root (Next.js app) — this is the incumbent authority for behavior and structure.
- Seed demo data: admin@demo.com; workers ana@demo.com, carlos@demo.com, maria@demo.com, javier@demo.com (password trabajador123).
- No marketing assets, testimonials, case studies, or press yet. Do not fabricate any.

## Product Principles

1. Clarity over decoration for the admin who manages many workers at once.
2. Configurable, not hardcoded: labels, cargos, and notifications adapt to each organization.
3. Zero marginal cost to the admin for notifications (email/SMTP on a free tier).
4. Worker self-service reduces admin load.
5. Spanish-first interface.

## Accessibility & Inclusion

Spanish is the primary language. Ensure readable contrast and keyboard-navigable admin tables/forms. No specific standard mandated yet.
