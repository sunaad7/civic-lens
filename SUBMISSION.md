# CivicLens — Hackathon Submission

> Report it. Track it. Fix it.

CivicLens closes the loop between residents and city teams. A resident snaps a
photo of a pothole, broken streetlight, or overflowing bin, pins it to a map,
and describes it by typing or voice. The city side gets a structured,
prioritized queue with an auditable trail from report to resolution.

## The problem

Civic issues are reported through scattered channels — phone calls, emails,
social posts, walk-ins — and then lost. Residents have no idea whether anyone
acted; city teams have no shared, geolocated backlog. The result is duplicated
reports, dead ends, and eroded trust.

## The solution

One platform, two experiences:

- **Residents** get a two-minute flow: pin location, attach up to five photos,
  dictate or type the description, then watch a live status timeline.
- **City teams** get an admin console: filterable queue, automatic triage,
  assignment, validated status transitions, a full event history per report,
  and one-click official response letters.

## Key features

- **Photo-first reporting** with camera/gallery upload and a map pin (Leaflet).
- **Voice dictation** via the Web Speech API — report hands-free while walking.
- **Map bbox search** — find nearby reports with a PostGIS bounding-box query.
- **Transparent lifecycle** — `submitted → triaged → assigned → in_progress →
  resolved` (with `rejected` exits); invalid transitions rejected server-side.
- **AI triage adapter** — provider interface that categorizes, scores severity,
  and routes to a department (deterministic offline stub shipped; drop-in for a
  real vision model).
- **Official letters, drafted** — admins generate a formal department letter
  from any report and it is cached on the record.
- **Citizen dashboard** — totals, status breakdown, profile completeness, and
  quick actions at a glance.
- **Audit trail** — every transition recorded with actor, timestamp, and note.

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite 8, TypeScript, react-router 8, TanStack Query, Leaflet, Tailwind v4, Motion |
| Backend  | Node.js, Express 5, TypeScript, Zod, Kysely, JWT (access + rotating httpOnly refresh cookie) |
| Database | PostgreSQL + PostGIS (Supabase) |
| Storage  | Supabase Storage, private bucket with signed URLs (local-disk fallback) |
| AI       | Provider interface with a deterministic offline stub |
| Quality  | Vitest + Supertest (API, 36 tests), Vitest + Testing Library (web, 13 tests) |

## Production hardening

- `helmet` security headers, `compression`, and per-IP rate limiting
  (600 req / 15 min overall, 40 / 15 min on auth).
- Cross-site refresh-cookie support (`SameSite=None; Secure`) for
  Vercel-web + Render-API deployments, with credential-scoped CORS allowlist.
- Recursive validation at every boundary and Kysely parameterized SQL.
- Config fail-fast: the API refuses to boot in production with weak, missing, or
  shared JWT secrets.
- Graceful shutdown on `SIGTERM`/`SIGINT` with pool draining; `/healthz`
  liveness and `/readyz` database readiness probes.
- React error boundary, SPA rewrites, asset caching, and SEO/social meta tags.
- Zero known vulnerabilities in production dependencies (`npm audit --omit=dev`).

## Try it

- **Live app:** _add Vercel URL_
- **API:** _add Render URL_ (`/healthz`)
- **Demo video:** _add link_
- **Admin demo:** seeded admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`

Local setup is in [README.md](./README.md#local-development).

## What makes it stand out

CivicLens is not a form with a database behind it — it is the full civic
workflow: geospatial storage, a state machine with an audit trail, an AI seam
that is real but swappable, and a deployment that is actually hardened. It runs
end to end today, with tests on both sides of the wire.
