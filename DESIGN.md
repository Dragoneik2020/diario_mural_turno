# Design

<!-- impeccable:design-schema 1 -->

## Overview

Design system for "Diario de Turnos" — a Spanish-language, web-based shift-management and internal-comms app for teams that rotate shifts. Built with Tailwind on a single `brand` blue accent over neutral slate. The system is intentionally small and configurable (shift-type labels and cargos are edited by the admin in-app), so components stay generic and data-driven.

This file is the single source of truth for visual decisions. It intentionally overrides ad-hoc CSS in components.

## Foundations

### Color

- **Brand (accent):** 50 `#eef6ff` → 900 `#1a348f`. Primary action uses `brand-600 #1d57f5`; hover `brand-700`. Section icons use `brand-600`.
- **Neutrals:** Tailwind `slate` for surfaces, text, borders. Body text `slate-900`; secondary `slate-600`; muted `slate-400` (used only for empty/placeholder copy, never on colored surfaces).
- **Semantic:** danger `red-500/600` for destructive actions and error text; success/confirmation conveyed via `brand` or `emerald` sparingly in status badges.
- **Surface:** app background is a soft top-to-bottom `slate` gradient (`#f8fafc` → `#eef2f7`); cards are solid white. No colored left/right borders on cards, lists, alerts, or callouts.

### Typography

- **Typeface:** system sans stack (`ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`). A self-hosted display face is a recommended addition once the brand is provided — do not treat the system sans as the final display voice.
- **Scale:** body `text-sm`/`text-base`; section headings `font-semibold` (≈`text-lg`–`text-xl`); page titles `text-2xl`; display max ~`text-4xl`. Clear weight steps, no tracking tricks.
- **Body measure:** forms and prose kept within a readable column; tables use tabular numerals.

### Spacing & Radius

- Spacing follows Tailwind's 4px scale. Generous separation between sections; tighter grouping inside a card. More space above a heading than below it.
- Radius: `rounded-xl` for controls/inputs, `rounded-2xl` for cards, `rounded-full` for badges/avatars.
- Elevation: `shadow-sm` (offset + soft blur) on cards; `shadow-lg` only as a deliberate lift on the primary brand mark. No zero-blur hard-offset shadows.

### Browser surfaces (themed, not default)

- **Selection:** brand-tinted (`#bcd9ff` on `#0b1f4d`).
- **Focus:** global `:focus-visible` 2px `brand-600` outline, 2px offset; buttons also carry `focus-visible:ring-2` in their hue.
- **Scrollbars:** thin, slate thumb with translucent track on hover.
- **Placeholders:** `slate-500 #64748b` for ≥4.5:1 contrast.
- **Links:** `text-underline-offset: 2px`.

## Components

Reusable classes (defined in `src/app/globals.css` under `@layer components`):

- `.card` — white, `rounded-2xl`, `shadow-sm`, `border border-slate-200`, `p-5`.
- `.btn` — inline-flex, `rounded-xl`, `gap-2`, semibold; variants `.btn-primary` (brand), `.btn-ghost` (slate-100), `.btn-danger` (red). All honor `disabled` (opacity + not-allowed) and focus rings.
- `.input` — full-width, `rounded-xl`, slate border, brand focus ring.
- `.label` — `text-sm font-medium text-slate-700` with `mb-1`.
- `.badge` — `rounded-full` pill for status and role tags.
- `.table` — shared data-table style: uppercase `slate-500` header on `slate-50`, row separators, and hover highlight. Apply with `className="table w-full text-sm"`; keep existing cell padding classes.
- `Avatar` (`src/components/Avatar.tsx`) — initials avatar in a solid `brand-600` circle, sizes `sm|md|lg`. Used for users in the navbar, worker/turn tables, board, calendar lists, and dashboard greeting. Never an emoji or photo placeholder.

### Icon system

- **lucide-react** is the only icon source. Consistent 1.5–2px stroke, sized `h-4 w-4` inside tab/button labels and `h-5 w-5` beside section headings (tinted `brand-600`). Pin status uses `Pin`; mural uses `Megaphone`; avatars use `User`.
- **Emoji are banned** as icons or decoration. Text badges (e.g., "Admin") replace emoji role markers.

## Layout patterns

- Sticky top navbar: solid white, bottom border, no translucency/blur. Brand mark is a rounded brand square with a `Calendar`-family icon.
- Content max width `max-w-6xl`, centered, with responsive grids (`grid-cols-1 lg:grid-cols-2`).
- Admin uses sub-navigation tabs; worker uses tabbed dashboard. Forms appear inline or in cards, never in modals for non-interruptive tasks.

## States

Every interactive surface ships: default, hover, disabled, loading (button label → `…`/`Entrando…`), error (red inline alert), and empty (muted `text-slate-400` copy). Data lists render an explicit empty message rather than collapsing silently.

## Bans honored

No gradient text, no glass/blur decoration, no hard-offset shadows, no colored borders >1px on cards/lists/alerts, no system display face as the display voice (pending brand), no emoji as icons, no kicker/eyebrow above headings, no section-number decoration.

## Known gaps / next

- **Brand:** a defined brand (logo, colors, identity) exists per the owner and is pending supply; apply and re-theme when provided. Current name "Diario de Turnos" is a working name.
- **Display voice:** swap system sans for a self-hosted display face once brand direction is set.
- **Multi-tenant:** product is scoped SaaS multi-empresa; current build is single-organization with no tenant scoping yet.
- **Per-view audit:** run the mechanical detector on each route once a render pipeline is available; this pass covered code-level floor violations (icons, blur, browser surfaces).
