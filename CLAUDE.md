# IoT Sentinel

Open-source platform for managing and cataloging IoT devices and network infrastructure.

## Architecture

```
frontend/    → Next.js 14+ (App Router, Tailwind v4, dark theme)
api/         → NestJS (TypeScript, Mongoose, Bull, Socket.IO)
worker/      → Python (nmap scanner, Bull queue consumer, health checker)
```

Docker Compose: `frontend:9000`, `api:9001`, `worker`, `mongodb:9017`, `redis:9079` (host ports, configurable via `.env`)

## Tech Stack

- **Backend:** NestJS 10, TypeScript, MongoDB/Mongoose, Redis/Bull, JWT auth, AES-256-GCM encryption
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, Lucide React, React Flow, Recharts
- **Worker:** Python 3.11, python-nmap, redis, mac-vendor-lookup, requests
- **Infra:** Docker Compose, MongoDB 7, Redis 7

## Code Patterns

### NestJS (api/)
- **Layer architecture:** Controller → Service → Repository (strict separation)
- **Controller** never accesses DB directly — always through Service
- **Service** never runs queries directly — always through Repository
- **Schema:** Use `HydratedDocument<T>` pattern (NOT `extends Document`)
- **DTOs:** `class-validator` + `class-transformer` for input validation
- **Auth:** `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.ADMIN)` on write endpoints
- **Pagination:** `PaginatedResponseDto.create(data, total, page, limit)` for all list endpoints
- **API prefix:** `/api/v1/` on all endpoints, Swagger at `/api/docs`
- **Tests:** Jest, mock repository in service tests, `mongodb-memory-server` for E2E
- **CORS:** `origin: true` in main.ts + custom `CorsIoAdapter` for Socket.IO

### Frontend (frontend/)
- **All pages are `'use client'`** (hooks everywhere)
- **Tailwind v4:** No `tailwind.config.ts` — theme via CSS `@theme inline` in `globals.css`
- **Services:** `src/services/*.service.ts` — each domain has its own service calling `api()` from `services/api.ts`
- **Components:** `src/components/ui/` (generic), `src/components/layout/` (shell), `src/components/things/` (domain)
- **Auth:** `AuthProvider` context wraps app, `AuthGuard` protects dashboard routes. Force logout + redirect on 401 after refresh failure.
- **API calls:** `api<T>(path, options)` — relative URLs only (`/api/v1/...`), auto token refresh on 401, handles empty body responses
- **API proxy:** Next.js middleware rewrites `/api/*` → API container (`API_INTERNAL_URL`), no `NEXT_PUBLIC_API_URL` needed
- **WebSocket:** Fetches `API_PUBLIC_URL` from `/runtime-config` route at runtime (no build-time baking)
- **ThingTypes context:** `ThingTypesProvider` wraps app, `useThingTypes()` for cached type data (icons, colors, capabilities)

### Worker (worker/)
- **Auto-detect mock mode:** On Docker Desktop (Windows/macOS), mock mode activates automatically
- **Scanner:** Consumes Bull jobs from Redis, publishes completion via Redis pub/sub. Extracts vendor (nmap + mac-vendor-lookup), OS, NetBIOS hostname.
- **Health checker:** Background thread pings registered Things every N seconds (interval from Settings API). Publishes results to `health:check:completed` Redis channel.
- **NestJS listens** for `bull:scanner:completed` and `health:check:completed` channels

## Data Model

```
Local → Network/VLAN → Thing → Channels (embedded)
                          ↕
                        Groups (transversal, many-to-many)

ThingType (CRUD, capabilities: enableChannels, enablePortScan, enableCredentials)
StatusEvent (transitions log, TTL 30 days)
```

- **MAC address** is the stable device identifier (IP changes with DHCP)
- **Credentials** encrypted with AES-256-GCM, key auto-generated at `/data/secrets/encryption.key`
- **Channels** are embedded in Things (for PLCs, multi-output devices)
- **Thing status** split into `registrationStatus` (discovered/registered) and `healthStatus` (online/offline/unknown)
- **ThingType** is a CRUD entity with slug, icon, color, capabilities. Seeded incrementally (adds missing types on startup, never overwrites user customizations).

## Key Modules (api/src/)

| Module | Endpoints | Notes |
|--------|-----------|-------|
| auth | `/api/v1/auth/login,refresh,logout` | JWT access (15m) + refresh (7d) tokens |
| users | `/api/v1/users` | CRUD, bcrypt 12 rounds |
| locals | `/api/v1/locals` | Physical locations |
| networks | `/api/v1/locals/:id/networks`, `/api/v1/networks` | VLANs, CIDR |
| things | `/api/v1/things`, `/api/v1/things/:id/history` | Filters: q, registrationStatus, healthStatus, networkId, groupId. History with uptime calc. |
| thing-types | `/api/v1/thing-types` | CRUD, GET is public (no auth). Capabilities per type. |
| groups | `/api/v1/groups` | Transversal, icon picker |
| scanner | `/api/v1/scanner/discover,jobs` | Rate limited (1 concurrent, 60s cooldown) |
| monitor | `/api/v1/monitor/status,check/:id,networks-to-check` | networks-to-check is public (used by worker) |
| status-history | (internal, used by things controller) | StatusEvent with TTL 30d, uptime calculation |
| notifications | `/api/v1/notifications`, `/api/v1/notifications/rules` | WebSocket at `/ws` |
| backup | `/api/v1/backup/export,restore`, `/api/v1/setup/restore` | Password-protected .json.gz, setup restore (no auth) |
| settings | `/api/v1/settings`, `/api/v1/setup/status,complete` | Setup wizard (fresh or restore) |
| dashboard | `/api/v1/dashboard/stats,uptime` | Thing counts by status + average uptime |
| crypto | (internal) | AES-256-GCM, encryptWithPassword for backups |
| health | `/health`, `/health/ready` | MongoDB + Redis checks |

## Running

```bash
cp .env.example .env
docker compose up -d          # Production
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d  # Dev with hot reload
```

First access: http://localhost:9000 → Setup wizard → Create admin (or restore backup) → Login

## Testing & Validation

```bash
cd api && npx jest --verbose           # Unit tests
cd api && npx jest --config test/jest-e2e.config.ts --forceExit  # E2E tests
cd frontend && npx next build          # Frontend build (TypeScript + static generation)
```

**IMPORTANT: Always run Docker builds as final validation before declaring work complete.**
Jest and `next build` run locally with different TypeScript settings than the Docker build.
The Docker build uses strict `tsc` and will catch type errors that local tools miss.

```bash
docker build -t test-api -f api/Dockerfile api/
docker build -t test-frontend -f frontend/Dockerfile frontend/
docker build -t test-worker -f worker/Dockerfile worker/
```

Full release (build + tag + push): `./scripts/release.sh <version>`

## Design Docs

- Original spec: `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`
- Phase plans: `docs/superpowers/plans/2026-03-23-phase*.md`
- ThingType CRUD: `docs/superpowers/specs/2026-03-26-thing-type-crud-design.md`
- Batch fixes v1: `docs/superpowers/specs/2026-03-26-batch-fixes-v1.md`
- Status history: `docs/superpowers/specs/2026-03-26-status-history-metrics.md`
- Network map topology: `docs/superpowers/specs/2026-03-26-network-map-topology.md`
