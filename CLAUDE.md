# IoT Sentinel

Open-source platform for managing and cataloging IoT devices and network infrastructure.

## Architecture

```
frontend/    → Next.js 14+ (App Router, Tailwind v4, dark theme)
api/         → NestJS (TypeScript, Mongoose, Bull, Socket.IO)
worker/      → Python (nmap scanner, Bull queue consumer)
```

Docker Compose: `frontend:9000`, `api:9001`, `worker`, `mongodb:9017`, `redis:9079` (host ports, configurable via `.env`)

## Tech Stack

- **Backend:** NestJS 10, TypeScript, MongoDB/Mongoose, Redis/Bull, JWT auth, AES-256-GCM encryption
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, Lucide React, React Flow
- **Worker:** Python 3.11, python-nmap, redis
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

### Frontend (frontend/)
- **All pages are `'use client'`** (hooks everywhere)
- **Tailwind v4:** No `tailwind.config.ts` — theme via CSS `@theme inline` in `globals.css`
- **Services:** `src/services/*.service.ts` — each domain has its own service calling `api()` from `services/api.ts`
- **Components:** `src/components/ui/` (generic), `src/components/layout/` (shell), `src/components/things/` (domain)
- **Auth:** `AuthProvider` context wraps app, `AuthGuard` protects dashboard routes
- **API calls:** `api<T>(path, options)` — auto token refresh on 401, handles empty body responses

### Worker (worker/)
- **Auto-detect mock mode:** On Docker Desktop (Windows/macOS), mock mode activates automatically
- **Communication:** Consumes Bull jobs from Redis, publishes completion via Redis pub/sub
- **NestJS listens** for `bull:scanner:completed` channel (NOT Bull @Process handlers)

## Data Model

```
Local → Network/VLAN → Thing → Channels (embedded)
                          ↕
                        Groups (transversal, many-to-many)
```

- **MAC address** is the stable device identifier (IP changes with DHCP)
- **Credentials** encrypted with AES-256-GCM, key auto-generated at `/data/secrets/encryption.key`
- **Channels** are embedded in Things (for PLCs, multi-output devices)

## Key Modules (api/src/)

| Module | Endpoints | Notes |
|--------|-----------|-------|
| auth | `/api/v1/auth/login,refresh,logout` | JWT access (15m) + refresh (7d) tokens |
| users | `/api/v1/users` | CRUD, bcrypt 12 rounds |
| locals | `/api/v1/locals` | Physical locations |
| networks | `/api/v1/locals/:id/networks`, `/api/v1/networks` | VLANs, CIDR |
| things | `/api/v1/things` | Filters: q, status, networkId, groupId |
| groups | `/api/v1/groups` | Transversal, icon picker |
| scanner | `/api/v1/scanner/discover,jobs` | Rate limited (1 concurrent, 60s cooldown) |
| monitor | `/api/v1/monitor/status,check/:id` | |
| notifications | `/api/v1/notifications`, `/api/v1/notifications/rules` | WebSocket at `/ws` |
| backup | `/api/v1/backup/export,restore` | Password-protected .json.gz |
| settings | `/api/v1/settings`, `/api/v1/setup/status,complete` | Setup wizard |
| dashboard | `/api/v1/dashboard/stats` | Thing counts by status |
| crypto | (internal) | AES-256-GCM, encryptWithPassword for backups |
| health | `/health`, `/health/ready` | MongoDB + Redis checks |

## Running

```bash
cp .env.example .env
docker compose up -d          # Production
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d  # Dev with hot reload
```

First access: http://localhost:9000 → Setup wizard → Create admin → Login

## Testing

```bash
cd api && npx jest --verbose           # 42 unit tests
cd api && npx jest --config test/jest-e2e.config.ts --forceExit  # 20 E2E tests
```

## Design Docs

- Spec: `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`
- Plans: `docs/superpowers/plans/2026-03-23-phase*.md`
