# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gestor de Impuestos** is a Colombian tax collection management platform for municipalities. It manages the full lifecycle of tax collection processes (cobro de cartera), from initial assignment through coercive collection.

## Commands

```bash
# Development
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Production build
pnpm lint             # Run ESLint

# Database
pnpm db:generate      # Generate new Drizzle migrations from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Open Drizzle Studio (visual DB browser)
pnpm db:push          # Push schema directly (dev only, no migration file)
pnpm db:check         # Test database connectivity

# Data import scripts
pnpm import:cartera               # Import transit fines from CSV
pnpm comparar:acuerdos            # Compare fines with payment agreements
pnpm actualizar:multa-intereses   # Update fines/interests from CSV
pnpm verificar:comparendos        # Verify fines CSV integrity

# Utilities
pnpm db:update-user-password      # CLI password reset tool
```

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + PostgreSQL + Drizzle ORM + NextAuth 4

**Request flow:** Browser → Middleware (auth check) → React Server Components → Server Actions → Drizzle ORM → PostgreSQL

### Key directories

- `app/(dashboard)/` — All authenticated routes; layout wraps content in sidebar
- `app/api/` — REST API routes (auth, actas, procesos, compromisos)
- `components/ui/` — Base Shadcn-style UI primitives
- `components/<feature>/` — Feature-specific components (procesos, actas, contribuyentes, etc.)
- `lib/actions/` — Server Actions handling all business logic and DB mutations
- `lib/db/schema/` — Drizzle schema definitions (one file per entity)
- `lib/db/index.ts` — DB connection initialization
- `scripts/` — One-off data import/migration scripts, run via `tsx`
- `drizzle/` — Auto-generated migration SQL files

### Server Actions pattern

All data mutations go through `lib/actions/`. Server Actions are called directly from Client Components or Server Components — avoid going through API routes for internal mutations. Each action file corresponds to an entity (e.g., `lib/actions/procesos.ts`).

### Database schema changes

1. Edit the relevant schema file in `lib/db/schema/`
2. Run `pnpm db:generate` to create a migration
3. Run `pnpm db:migrate` to apply it

The DB connection uses `prepare: false` (required for Supabase/PgBouncer connection pooling).

### Authentication & authorization

- NextAuth 4 with JWT strategy (`lib/auth.ts`)
- Two roles: `admin` and `empleado`
- Middleware at `middleware.ts` protects all dashboard routes and restricts `/usuarios`, `/cargos`, `/impuestos` to admins
- Server-side session access via `lib/auth-server.ts`

### File storage

Dual storage backend in `lib/uploads.ts`: defaults to local `/uploads` directory; switches to AWS S3 when `AWS_*` env vars are set.

## Bulk Import Feature

Admins can import procesos from CSV/Excel via `/procesos/importar`. Key files:
- `lib/actions/importar-procesos.ts` — two server actions: `previewImportacion` (parse + preview) and `ejecutarImportacion` (full import)
- `components/procesos/importar-procesos-form.tsx` — multi-step client component (upload → preview → confirm modal → results)
- `lib/db/schema/importaciones.ts` — `importaciones_procesos` table tracking each import batch (filename, user, timestamps, counts)
- `procesos.importacion_id` — FK linking each imported process to its import batch

The CSV format is semicolon-separated, matching `ReporteCarteraActual.csv`. Excel (`.xlsx`) is also supported via ExcelJS. Deduplication uses the same composite key as the CLI script (`scripts/import-cartera-transito.ts`).

## Process Workflow States

The core entity is `procesos` (tax collection cases). Valid states:

`pendiente` → `asignado` → `facturacion` → `acuerdo_pago` / `en_cobro_coactivo` → `finalizado`

State transition logic lives in `lib/estados-proceso.ts`. Every state change is recorded in `historial_proceso` (audit trail).

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — App URL

For local development, start PostgreSQL with `docker compose up -d` (creates `gestor_impuestos` DB on port 5432).

## Conventions

- **Language:** All UI text, variable names, DB columns, and comments are in Spanish
- **File naming:** kebab-case for files, snake_case for DB columns, PascalCase for TypeScript types
- **Package manager:** pnpm (do not use npm or yarn)
- **Component style:** Shadcn/ui patterns — components in `components/ui/` wrap Radix UI primitives
