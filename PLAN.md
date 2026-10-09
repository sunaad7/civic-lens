# civic-lens — Scaffold Plan

**Decisions locked in:** TypeScript, `web/` + `api/` (independent deploys), SQL migrations + Kysely, self-rolled JWT, AI adapter/stub first, Docker PostGIS locally, full end-to-end build.

**Target versions:** Vite 8 / React 19 / react-router 8, Express 5, Kysely 0.29, Node 22.22+ (24 LTS ideal), Vitest 5.

---

## Architecture

```
┌──────────────────────────┐
│  React + Vite (Vercel)   │
│  Citizen app │ Admin UI  │
│  Leaflet · Web Speech    │
└────────────┬─────────────┘
             │ REST (JSON, JWT)
┌────────────▼─────────────┐
│  Node/Express (Render)   │
│  ├─ auth                 │
│  ├─ complaints           │
│  ├─ admin                │
│  └─ ai service ──────────┼──► Vision LLM API
│                          │      (image → JSON triage,
│                          │       letter drafting)
└───────┬──────────┬───────┘
        │          │
┌───────▼───────┐ ┌▼──────────────────┐
│ Postgres +    │ │ Object storage    │
│ PostGIS       │ │ (Supabase Storage)│
│ (Supabase)    │ │ complaint images  │
└───────────────┘ └───────────────────┘
```

---

## 1. Repo layout

```
civic-lens/
├── README.md                  # setup, env docs, deploy notes
├── .gitignore
├── package.json               # root convenience scripts only (concurrently), NOT a workspace
├── docker-compose.yml         # postgis/postgis:16-3.4, port 5432, db=civiclens
├── web/                       # ── Vercel ──
│   ├── package.json  vite.config.ts  vercel.json  tsconfig.json
│   ├── .env.example           # VITE_API_BASE_URL
│   └── src/
│       ├── main.tsx  App.tsx (router)  index.css
│       ├── lib/api.ts         # fetch wrapper: auth header, 401→refresh→retry, typed errors
│       ├── lib/auth.tsx       # AuthContext, useAuth, RequireAuth, RequireRole
│       ├── pages/
│       │   ├── LoginPage.tsx  RegisterPage.tsx
│       │   ├── citizen/ReportPage.tsx  MyComplaintsPage.tsx  ComplaintDetailPage.tsx
│       │   └── admin/AdminQueuePage.tsx  AdminDetailPage.tsx
│       ├── components/
│       │   ├── MapPicker.tsx  ComplaintMap.tsx   # react-leaflet, OSM tiles
│       │   ├── VoiceInput.tsx                    # webkitSpeechRecognition dictation
│       │   ├── ComplaintForm.tsx  StatusBadge.tsx
│       └── lib/  (types.ts shared with responses, hooks.ts for queries)
└── api/                       # ── Render ──
    ├── package.json  tsconfig.json  render.yaml  .env.example
    ├── db/
    │   ├── migrations/001_init.sql  002_*.sql
    │   ├── migrate.ts          # tiny runner: ordered *.sql in tx, schema_migrations table
    │   └── seed.ts             # admin user from env
    └── src/
        ├── index.ts            # listen
        ├── app.ts              # app factory (testable): cors, routes, error handler
        ├── config.ts           # zod-validated env
        ├── lib/  jwt.ts  storage.ts (Supabase)  logger.ts
        ├── db/  client.ts (pg Pool + Kysely)  types.ts (kysely-codegen)
        ├── middleware/  auth.ts  validate.ts  error.ts
        └── modules/
            ├── auth/       routes.ts  service.ts
            ├── complaints/ routes.ts  service.ts  schema.ts
            ├── admin/      routes.ts  service.ts  schema.ts
            └── ai/         provider.ts (interface + factory)  stub.ts  routes.ts  service.ts
```

---

## 2. Database (`001_init.sql`)

- `CREATE EXTENSION IF NOT EXISTS postgis` (+ `citext`)
- **users**: id uuid PK, email citext UNIQUE, password_hash, name, role `citizen|admin`, created_at
- **complaints**: id uuid PK, reporter_id FK, title, description, category, status (`submitted → triaged → assigned → in_progress → resolved | rejected`), `location geography(Point,4326)`, location_label, ai_triage jsonb, letter_draft text, timestamps
- **complaint_images**: id, complaint_id FK, storage_path, ai_analysis jsonb
- **complaint_events**: id, complaint_id, event_type, actor_id, payload jsonb, created_at (status history)
- **refresh_tokens**: id, user_id, token_hash, expires_at, revoked_at
- Indexes: `GIST(location)`, status+created_at, reporter_id
- `updated_at` trigger
- Runner: `migrate.ts` applies sorted `.sql` files, each in a transaction, recorded in `schema_migrations`
- Kysely types via `kysely-codegen` after migrate (`npm run db:types`)

---

## 3. API surface

**auth** — `POST /api/auth/register|login|refresh|logout`, `GET /api/auth/me`
- bcrypt hash, access JWT 15 min (Authorization header), refresh JWT 30 d httpOnly cookie (SameSite=Lax, Secure prod), rotation + DB revocation
- CORS: allowlist `CORS_ORIGINS`, `credentials: true`

**complaints** — `POST /api/complaints` (multipart, up to 5 images via multer), `GET /api/complaints` (mine), `GET /api/complaints/:id`, `GET /api/complaints?bbox=w,s,e,n` (map, `ST_MakeEnvelope` + `ST_Intersects`)
- On create: upload images to Supabase Storage (`storage.ts`, service-role key), insert row, then fire-and-forget `aiService.triage()` → updates `ai_triage` + status→`triaged` (instant with stub; swap provider later without changing flow)

**admin** (role middleware) — `GET /api/admin/complaints` (filters: status, category, q), `PATCH .../:id/status`, `POST .../:id/assign`, `GET .../:id/letter` (calls `draftLetter`, caches to `letter_draft`)

**health**: `GET /healthz` (Render health check)

**ai/provider.ts**

```ts
interface AiProvider {
  triageImage(img: { bytes: Buffer; mimeType: string }): Promise<TriageResult>; // category, severity 1-5, dept, confidence, summary
  draftLetter(input: { complaint; events }): Promise<string>;
}
```

- `AI_PROVIDER=stub` default; factory reads env; OpenAI/Anthropic impls added later as new files — no SDK deps in scaffold

---

## 4. Frontend

- **Routes**: `/login`, `/register`, `/` (report), `/my`, `/complaints/:id`, `/admin`, `/admin/:id` — `RequireRole="admin"` guards admin segment
- **ReportPage**: title/description (with `VoiceInput` dictation), category select, Leaflet `MapPicker` (click/drag pin), photo input (camera `capture` attr), submit
- **AdminQueuePage**: filterable table, status pills; detail page shows map, images, AI triage JSON panel, status/assign actions, letter draft + "read aloud" via `speechSynthesis`
- **api.ts**: single refresh-retry path; TanStack Query for lists/detail state
- **vite.config.ts**: dev proxy `/api → http://localhost:3001`
- `vercel.json`: SPA rewrites → `/index.html`, build `npm run build`, output `dist`

---

## 5. Config & deploy

- `api/.env.example`: `PORT DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_BUCKET AI_PROVIDER CORS_ORIGINS`
- `render.yaml`: Node web service, root `api`, `npm ci && npm run build`, start `node dist/index.js`, release phase `npm run migrate`, health `/healthz`
- `npm run seed` creates admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- README: local flow (`docker compose up -d` → `npm run migrate` → `npm run dev`), Supabase bucket setup (`complaint-images`, private + signed URLs), Vercel/Render env var tables

---

## 6. Build order (phases)

1. Root: gitignore, README skeleton, docker-compose, root scripts
2. `web/` via `create-vite --template react-ts` + deps (react-router, leaflet, react-leaflet, @tanstack/react-query, zod)
3. `api/` shell: Express 5 app factory, config, error middleware, healthz, vitest+supertest harness
4. Migrations runner + `001_init.sql` + seed + `db:types`
5. Auth module end-to-end (tests: register/login/refresh/me)
6. Complaints module + Supabase storage + bbox query (tests with stub)
7. Admin module + AI provider (stub) + triage/letter wiring
8. Frontend: auth → report flow → my complaints → admin queue/detail
9. Deploy configs (`vercel.json`, `render.yaml`), README finalization
10. **Verify**: `tsc --noEmit` + lint both apps, api test suite green, boot full stack against Docker DB, curl smoke (register → create complaint → triage appears → admin list), `npm run build` both

**Explicitly out of scope:** real LLM SDK wiring, email notifications, rate limiting, Supabase local CLI, CI (can add later).
