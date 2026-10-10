# CivicLens — Project Status

_Last updated: Oct 9, 2026_

## Overview

CivicLens is a civic complaint platform: residents report local issues (photo, location, text/voice), and city teams triage, assign, and resolve them with a full event/audit trail.

**Stack:** React 19 + Vite 8 + TypeScript + Tailwind v4 (`web/`) · Express 5 + Kysely + Postgres/PostGIS (`api/`) · Supabase Storage for photos · self-rolled JWT auth (15-min access + rotating httpOnly refresh cookie) · Deploy targets: Vercel (two projects — `web` frontend + `api` serverless function).

**Excluded by design:** LLM API key wiring — AI adapter runs in stub mode only (`AI_PROVIDER=stub`).

## What's done

- All 10 phases of `PLAN.md` implemented end to end.
- Database: migration `001_init.sql` applied (PostGIS 3.3, `ST_MakeEnvelope` bbox queries verified), seed data in place.
- Supabase cutover complete: DB via session pooler (`aws-0-ap-southeast-1.pooler.supabase.com:5432`, `uselibpqcompat=true`), photos via Supabase bucket `complaint-images` with signed URLs.
- End-to-end smoke verified: register → complaint + photo upload → signed URL 200 → bbox query → admin assign/status/letter draft → events persisted.
- Auth: access/refresh rotation, role-based routing (citizen/admin), httpOnly cookie scoped to `/api/auth`.
- Admin queue/detail, citizen report/my-complaints/detail pages, status pipeline, audit events, letter drafts (stubbed).
- Deploy config ready: `web/vercel.json`, `docker-compose.yml`, `.env.example` docs (API is Vercel zero-config Express).

## Frontend polish (this session)

Ran the **Aceternity UI skill** and rebuilt the public face of the app:

- **Tailwind v4 added** to `web/` (`@tailwindcss/vite`), Inter via `@fontsource-variable/inter`, brand tokens (`--color-brand: #1663d0`) in `index.css`; existing CSS moved into `@layer components` so utilities win.
- **Landing page** (`/`) — sticky glass nav, dark hero with `BackgroundBeams` + `TypewriterEffect` ("Report it. Track it. Fix it."), 3D-card feature grid, 3-step "How it works", status badges, CTA band, footer.
- **Auth pages** — shared `AuthShell` (grid-glow background, centered card), restyled `LoginPage` / `RegisterPage` with h-11 inputs and brand focus rings.
- **Route restructure** — `/` → public landing, app moved to `/report`, `*` → landing; nav, `RequireAuth` role-mismatch redirect, and MyComplaints links updated.
- **Ported Aceternity components** (`background-beams`, `typewriter-effect`, `3d-card`) cleaned to project standards: no unused params, no `Math.random` in render (deterministic `rand()`), correct effect deps, component-only exports.

### Verification

| Check          | Result                        |
| -------------- | ----------------------------- |
| `tsc -b`       | clean                         |
| `oxlint`       | exit 0, no warnings           |
| `web` tests    | **13/13 pass**                |
| `api` tests    | 39/39 pass                    |
| `vite build`   | ✓ route/vendor-split, no warning |

## Production hardening (this session)

- API: `helmet`, `compression`, per-IP rate limiting (600/15m, 40/15m on auth),
  `TRUST_PROXY` + cross-site `SameSite=None` refresh cookies, config fail-fast on
  weak/shared production secrets, graceful shutdown, `/readyz` DB probe.
- Web: `ErrorBoundary`, SEO/social meta, vendor chunk splitting, Vercel security
  + immutable asset-cache headers.
- Landing hero retinted to brand blues/violet with a navy radial glow.
- Docs: production checklist in `README.md`; hackathon write-up in `SUBMISSION.md`.
- `npm audit --omit=dev`: 0 vulnerabilities (api + web).

## Vercel migration (this session)

- Moved the API off Render onto Vercel as a **second project** (`api`, root directory `api`, zero-config Express): `api/src/app.ts` exports the Express app as its default (Vercel's function entry) and `api/src/index.ts` imports it, only starting a listener when `!process.env.VERCEL`. `helmet` / `express-rate-limit` are imported resolution-agnostically so Vercel's own type-check and module loader both resolve them.
- Serverless-safe `pg` pool (`DB_POOL_MAX`, default 3) and pool timeouts; use Supabase transaction pooler (port 6543) for `DATABASE_URL`.
- Enforced Vercel's 4.5 MB body limit: API caps total image upload at 4 MB; the web client compresses photos to JPEG (`web/src/lib/image.ts`) with a live size guard in `ReportPage`.
- Removed `render.yaml`; updated README/SUBMISSION deploy docs.
- Verified: web lint/typecheck + 13/13, api 39/39, both builds, 0 prod vulns.

## Remaining (user actions)

1. **Rotate credentials** — rotate the Supabase DB password, the service-role key, and the JWT secrets that were shared during development, then update `api/.env` and the Vercel project env vars and re-run a migrate sanity check.
2. **Deployed** — both Vercel projects are live: web `https://civic-lens-sunaad7.vercel.app`, API `https://civic-lens-api.vercel.app` (`/healthz`, `/readyz`, and admin sign-in verified end to end).
3. Optional: Supabase free-tier projects pause after ~7 days idle (local dev/tests unaffected — they run on Homebrew PostgreSQL 17, port 5433).

## Key files

| Path                                       | Purpose                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `PLAN.md`                                  | Original build plan (10 phases)                  |
| `api/.env` / `api/.env.example`            | Supabase DB + storage config (gitignored)        |
| `api/migrations/001_init.sql`              | Full schema (PostGIS, complaints, events, roles) |
| `api/src/lib/storage.ts`                   | Supabase/local storage backends                  |
| `web/src/pages/LandingPage.tsx`            | New landing page                                 |
| `web/src/components/AuthShell.tsx`         | Shared auth page shell                           |
| `web/src/components/ui/*.tsx`              | Ported Aceternity components                     |
| `web/src/App.tsx`                          | Route map (`/` landing, `/report` app)           |
| `web/src/test/setup.ts`                    | Test environment stubs                           |
| `web/vercel.json`                          | Web deploy config (SPA rewrites + headers)       |
| `web/src/lib/image.ts`                     | Client-side photo compression for uploads        |
