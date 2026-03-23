# IoT Sentinel — Design Spec

## Overview

IoT Sentinel is an open-source, Docker-based platform for managing and cataloging IoT devices and network infrastructure. It solves the problem of not knowing where devices are, their IPs, credentials, or status across multiple locations and networks.

**Target users:** Developers and homelab enthusiasts managing multiple IoT devices across different locations.

**Core value:** One place to register, find, and monitor every device on your networks.

## Architecture

### Approach: Decoupled Backend + Frontend

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Next.js     │────▶│  NestJS API  │────▶│ MongoDB │
│  (Frontend)  │◀────│  (REST)      │◀────│         │
│  :3000       │     │  :4000       │     │  :27017 │
└─────────────┘     └──────┬───────┘     └─────────┘
                           │
                    ┌──────▼───────┐     ┌─────────┐
                    │    Redis     │◀───▶│ Python  │
                    │  (Bull Queue)│     │ Worker  │
                    │  :6379       │     │ (nmap)  │
                    └──────────────┘     └─────────┘
```

**Why this approach:**
- API is reusable (mobile, CLI in the future)
- Frontend and backend deploy independently
- Simple enough: 5 containers, one `docker-compose up`
- Python worker handles network scanning where Python excels (nmap, scapy)

### Worker-to-API Communication

The Python worker communicates exclusively via Redis/Bull queues. It never calls the NestJS API over HTTP and never writes to MongoDB directly.

**Flow:**
1. NestJS enqueues a job in Bull (e.g., `scan:discovery`)
2. Python worker consumes the job from Redis
3. Worker executes the scan and writes the result as the Bull job's completion payload
4. NestJS listens for Bull job completion events and processes the results (MAC matching, status updates, notification triggers)

This keeps all business logic in the NestJS service layer while the worker remains a stateless executor.

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js (App Router) + TypeScript |
| Backend API | NestJS + TypeScript |
| Database | MongoDB + Mongoose |
| Queue | Redis + Bull |
| Scanner | Python + python-nmap |
| Containerization | Docker + Docker Compose |

## Data Model

### Local

Represents a physical location.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | string | e.g., "Casa", "Escritorio" |
| description | string | Optional |
| address | string | Optional physical address |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### Network

Represents a network/VLAN within a Local.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| localId | ObjectId | Ref → Local |
| name | string | e.g., "VLAN 10 - IoT" |
| vlanId | number | VLAN ID, null for untagged LAN |
| cidr | string | e.g., "192.168.10.0/24" |
| gateway | string | e.g., "192.168.10.1" |
| description | string | Optional |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### Thing

Represents any network device or service.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| networkId | ObjectId | Ref → Network |
| groupIds | ObjectId[] | Ref → Group[] |
| name | string | e.g., "Camera Garagem" |
| type | enum | camera, switch, sensor, nvr, vm, service, plc, other |
| macAddress | string | Primary stable identifier (unique) |
| ipAddress | string | Last known IP |
| hostname | string | Discovered or manual |
| status | enum | online, offline, unknown, discovered |
| lastSeenAt | Date | Last successful contact |
| ports | Port[] | Discovered open ports (see below) |
| channels | Channel[] | Device sub-components (see below) |
| credentials | Credentials | Encrypted access info (see below) |
| metadata | object | Free-form: firmware, model, manufacturer, etc. |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

**Port (embedded):**

| Field | Type | Description |
|-------|------|-------------|
| port | number | e.g., 80 |
| protocol | string | tcp, udp |
| service | string | e.g., "http" |
| version | string | e.g., "nginx 1.2" |

**Channel (embedded):**

| Field | Type | Description |
|-------|------|-------------|
| number | number | Channel index (1, 2, 3...) |
| direction | enum | input, output, bidirectional |
| name | string | e.g., "Lampada Hall de Entrada" |
| type | enum | light, motor, sensor, relay, camera, port, other |
| description | string | Optional |
| icon | string | Optional, inherits from type |

**Credentials (embedded, encrypted):**

All credential fields are encrypted with AES-256-GCM using the instance `ENCRYPTION_KEY`.

| Field | Type | Description |
|-------|------|-------------|
| username | string | Encrypted with AES-256-GCM |
| password | string | Encrypted with AES-256-GCM |
| notes | string | Optional, encrypted with AES-256-GCM |

### Group

Transversal grouping of Things (a Thing can belong to multiple Groups).

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | string | e.g., "Cameras", "Switches" |
| icon | string | Icon identifier from icon library |
| color | string | Hex color for badges |
| description | string | Optional |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### User

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| username | string | Unique |
| password | string | bcrypt hash |
| role | enum | admin, viewer |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### ScanJob

Records scan history.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| networkId | ObjectId | Ref → Network |
| type | enum | discovery, status_check, deep_scan |
| status | enum | queued, running, completed, failed |
| triggeredBy | enum | manual, scheduled |
| userId | ObjectId | Ref → User (who triggered, null if scheduled) |
| startedAt | Date | When execution began |
| completedAt | Date | When execution finished |
| results | DiscoveredHost[] | Array of discovered hosts (see below) |
| createdAt | Date | Auto-generated |

**DiscoveredHost (embedded in ScanJob.results):**

| Field | Type | Description |
|-------|------|-------------|
| macAddress | string | MAC address |
| ipAddress | string | IP address |
| hostname | string | Discovered hostname |
| ports | Port[] | Open ports with service/version info |
| isNew | boolean | True if MAC was not previously registered |

### NotificationRule

Defines when and how to notify.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | string | e.g., "Cameras offline > 5min" |
| targetType | enum | thing, group, network, local |
| targetId | ObjectId | Ref to target |
| condition | enum | offline_duration, status_change, new_discovery |
| threshold | number | Seconds (e.g., 300 = 5min) |
| channels | string[] | ["in_app", "email", "telegram", "webhook"] |
| enabled | boolean | Active or not |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-generated |

### Notification

Individual notification instances.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| ruleId | ObjectId | Ref → NotificationRule |
| thingId | ObjectId | Ref → Thing |
| type | enum | thing_offline, thing_online, new_discovery, scan_failed |
| message | string | Human-readable message |
| read | boolean | Seen by user |
| sentTo | string[] | Channels already dispatched |
| createdAt | Date | Auto-generated |

### Settings

System-wide configuration stored in MongoDB.

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| instanceName | string | Name of this installation |
| language | string | pt-BR, en-US |
| timezone | string | e.g., "America/Sao_Paulo" |
| setupCompleted | boolean | Wizard finished |
| backup.autoEnabled | boolean | Auto-backup on/off |
| backup.frequency | enum | daily, weekly, monthly |
| backup.password | string | Encrypted default password |
| backup.retention | number | Keep last N backups |
| backup.destination | enum | local, google_drive, s3 |
| monitor.statusCheckInterval | number | Seconds between ping sweeps |
| scanner.maxConcurrentScans | number | Max simultaneous scans (default: 1) |
| scanner.cooldownSeconds | number | Min interval between scans of same network (default: 60) |

### Database Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| Thing | `macAddress` | unique | Primary device identifier |
| Thing | `networkId` | regular | Filter things by network |
| Thing | `status` | regular | Filter by online/offline |
| Thing | `groupIds` | regular | Filter by group |
| Network | `localId` | regular | List networks per local |
| Notification | `read` | regular | Unread notification queries |
| Notification | `createdAt` | regular | Notification history sorting |
| ScanJob | `networkId, status` | compound | Active scans per network |

### Data Hierarchy

```
Local (casa, empresa)
  └── Network/VLAN (VLAN 10 - IoT, VLAN 20 - Cameras)
       └── Thing (Sonoff, camera, NVR, PLC)
            ├── Channels (PLC outputs, DVR inputs)
            └── Groups (transversal tags: "Cameras", "Switches")
```

## API Design

### Versioning

All endpoints are prefixed with `/api/v1/`. This allows future breaking changes via `/api/v2/` without disrupting existing clients (mobile, CLI, integrations).

### NestJS Modules

```
src/
├── auth/          → Login, JWT, guards
├── users/         → CRUD users
├── locals/        → CRUD locals
├── networks/      → CRUD networks/VLANs
├── things/        → CRUD things + channels
├── groups/        → CRUD groups + icons
├── scanner/       → Orchestrates scans (enqueues Bull jobs)
├── monitor/       → Periodic health checks (cron → Bull)
├── notifications/ → Rules, in-app notifications, channel interface
├── backup/        → Export/import, scheduled backups
├── settings/      → System config, setup wizard
├── crypto/        → Encrypt/decrypt credentials service
├── health/        → Health check and readiness endpoints
└── common/        → Filters, interceptors, base DTOs, pagination
```

### Layer Architecture (per module)

```
src/<module>/
├── <module>.controller.ts      → HTTP: routes, input validation, responses
├── <module>.service.ts          → Business logic, orchestration
├── <module>.repository.ts       → MongoDB access, queries
├── <module>.module.ts           → NestJS wiring
├── dto/
│   ├── create-<entity>.dto.ts   → Input validation (class-validator)
│   └── update-<entity>.dto.ts
├── schemas/
│   └── <entity>.schema.ts       → Mongoose schema
├── interfaces/
│   └── <entity>.interface.ts    → Types/contracts
└── helpers/
    └── <entity>.mapper.ts       → Entity ↔ DTO transformations
```

**Principles:**
- Controller never accesses the database directly — always through Service
- Service never runs queries directly — always through Repository
- Repository is the only layer that knows Mongoose/MongoDB
- DTOs validate input at the boundary, entities represent the domain
- One module per domain — a service never imports another module's repository, always consumes via exported service
- Dependency injection everywhere — easy to test (mock repository in service, mock service in controller)

### Pagination

All list endpoints support pagination with a standard contract:

**Request:** `?page=1&limit=20` (defaults: page=1, limit=20, max limit=100)

**Response:**
```json
{
  "data": [],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### Endpoints

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /health`, `GET /health/ready` |
| Auth | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` |
| Users | CRUD `/api/v1/users` |
| Locals | CRUD `/api/v1/locals` |
| Networks | CRUD `/api/v1/locals/:id/networks`, `GET /api/v1/networks` (global list) |
| Things | CRUD `/api/v1/things`, `GET /api/v1/things/search?q=`, `GET /api/v1/things?groupId=&networkId=&status=&localId=` |
| Groups | CRUD `/api/v1/groups`, `GET /api/v1/groups/:id/things` |
| Scanner | `POST /api/v1/scanner/discover`, `GET /api/v1/scanner/jobs`, `GET /api/v1/scanner/jobs/:id` |
| Monitor | `GET /api/v1/monitor/status`, `POST /api/v1/monitor/check/:thingId` |
| Notifications | CRUD `/api/v1/notifications/rules`, `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read` |
| Backup | `POST /api/v1/backup/export`, `POST /api/v1/backup/restore`, `GET /api/v1/backup/history` |
| Settings | `GET /api/v1/settings`, `PATCH /api/v1/settings` |
| Setup | `GET /api/v1/setup/status`, `POST /api/v1/setup/complete` |
| Dashboard | `GET /api/v1/dashboard/stats` |

**Notes:**
- `GET /api/v1/networks` provides a global list across all locals (useful for dashboard dropdowns)
- `GET /api/v1/things?localId=` allows filtering things by local without traversing Network first
- Health endpoints are NOT versioned (infrastructure concern, not API contract)

### WebSocket Gateway

Real-time push notifications via Socket.IO (built-in NestJS support).

**Endpoint:** `ws://localhost:4000/ws`

**Authentication:** JWT token passed in the handshake `auth` payload. Invalid or expired tokens reject the connection.

**Events (server → client):**

| Event | Payload | Description |
|-------|---------|-------------|
| `thing:status_changed` | `{ thingId, name, previousStatus, newStatus, timestamp }` | Thing went online/offline |
| `scan:started` | `{ jobId, networkId, type }` | Scan job began execution |
| `scan:completed` | `{ jobId, networkId, newThings, updatedThings }` | Scan finished with results summary |
| `scan:failed` | `{ jobId, networkId, error }` | Scan job failed |
| `notification:new` | `{ notificationId, type, message, thingId }` | New notification created |

**Reconnection:** Client implements exponential backoff (1s, 2s, 4s, 8s, max 30s). Socket.IO handles this natively.

**Owner module:** `notifications/` module owns the WebSocket gateway, other modules emit events through the `NotificationService`.

### Scanner Rate Limiting

To prevent network disruption and resource exhaustion:

- **Max concurrent scans:** 1 per network (configurable via Settings)
- **Cooldown:** Minimum 60 seconds between scans of the same network (configurable)
- **Global queue depth:** Maximum 10 pending scan jobs
- Duplicate scan requests for the same network while a scan is running are rejected with `409 Conflict`

**Cross-cutting:**
- JWT authentication: access token (15min) + refresh token (7d, stored in MongoDB for revocation support)
- Swagger/OpenAPI auto-generated at `/api/docs`
- CORS configured for frontend origin only

## Python Worker (Scanner)

### Job Types

| Job | Description | Trigger |
|-----|-------------|---------|
| `discovery` | Full CIDR scan — hosts, MAC, ports, services, versions | Manual or scheduled |
| `status_check` | Fast ping sweep on registered things | Periodic (configurable, default 5min) |
| `deep_scan` | Detailed scan of a single thing — all ports, OS detection | Manual |

### Discovery Flow

```
NestJS enqueues job {networkId, cidr: "192.168.10.0/24"}
    → Worker consumes from Redis/Bull
    → nmap -sn -sV <cidr>
    → Writes result as Bull job completion payload:
      [{mac, ip, hostname, ports[], services[]}]
    → NestJS listens for job completion event
    → NestJS processes results (in service layer):
        → Known MAC: updates IP, ports, status, lastSeenAt
        → New MAC: creates thing with status "discovered" (pending user action)
        → Triggers notifications if status changed
```

### Docker Configuration

- Runs with `network_mode: host` (required for nmap to see the host's real network)
- `NET_ADMIN` capability for raw sockets
- Status checks are lightweight (ping only) to avoid network congestion

**Platform limitation:** `network_mode: host` only works on Linux Docker hosts. On Docker Desktop (macOS/Windows), the worker runs inside a VM and cannot see the host network. For development on macOS/Windows, the worker operates in mock mode with simulated scan results. Production scanning requires a Linux host (bare metal, VM, or cloud instance).

## Frontend (Next.js)

### Pages

| Route | Description |
|-------|-------------|
| `/login` | Login screen, dark, minimal |
| `/` | Dashboard — stat cards (total things, online, offline, per local) |
| `/map` | Network map — topology with icons and status colors |
| `/locals` | Locals list with counters |
| `/locals/:id` | Local detail — networks, associated things |
| `/things` | Table with filters (local, network, group, status) + text search |
| `/things/:id` | Thing detail — info, channels, credentials (reveal on click), status history |
| `/things/discovered` | Things found by scan, pending registration |
| `/groups` | Groups list with icons and counters |
| `/groups/:id` | Group things |
| `/scanner` | Manual scan trigger, running jobs, history |
| `/settings` | Scan intervals, user management, backup config |
| `/setup` | First-boot wizard |

### Frontend Layer Architecture

```
src/
├── components/       → Pure UI, no business logic
├── hooks/            → Reusable logic (useThings, useScanner)
├── services/         → API calls (axios/fetch)
├── types/            → TypeScript interfaces
├── utils/            → Pure helpers (formatters, validators)
└── app/              → Pages (Next.js App Router)
```

### Visual Design

- Dark theme by default (Grafana/Datadog style)
- Status colors: green (online), red (offline), gray (unknown/discovered)
- Cards with micro-sparklines or uptime indicators
- Fixed sidebar with icon navigation
- Notification bell with badge in header
- Responsive but desktop-focused
- Network map using **React Flow** (customizable graph library)

## Setup Wizard

On first boot (detected by empty `settings` collection):

```
Step 1: Language (pt-BR, en-US)
Step 2: Create admin user (username, password)
Step 3: Basic config (instance name, timezone)
Step 4: Choose → "Start fresh" or "Restore backup"
Step 5: (if fresh) Register first Local + Network
        (if backup) Upload backup file + enter backup password → restore
```

All routes redirect to `/setup` until wizard is completed.

## Backup & Restore

### Export

Generates a password-protected `.json.gz` file containing:
- Settings, users (hashed passwords only), locals, networks, things, groups
- Notification rules
- Metadata: app version, export date

**Credential handling on export:**
```
Credentials (encrypted with instance ENCRYPTION_KEY)
  → Decrypt
  → Re-encrypt with user-provided backup password (AES-256-GCM)
  → Save to backup file
```

### Restore

```
User provides backup file + backup password
  → Decrypt credentials with backup password
  → Re-encrypt with new instance's ENCRYPTION_KEY
  → Import to MongoDB
```

The `ENCRYPTION_KEY` never leaves the instance. Backup files are self-contained and safe to store anywhere.

### Automated Backups

| Setting | Description |
|---------|-------------|
| Enabled | on/off |
| Frequency | daily, weekly, monthly |
| Default password | Set once, used for all auto-exports (stored encrypted) |
| Destination | local volume (v1), Google Drive / S3 (future) |
| Retention | Keep last N backups |

## Notifications

### v1: In-App Only

- `NotificationService` evaluates rules against thing status changes
- `NotificationGateway` (WebSocket) pushes real-time to the frontend
- Bell icon with unread badge in header

### Future: External Channels

Interface `NotificationChannel` with implementations:
- `InAppChannel` (v1)
- `EmailChannel` (future)
- `TelegramChannel` (future)
- `WebhookChannel` (future)

Adding a new channel = implementing one interface. No architecture changes needed.

## Security

### Authentication

- JWT-based authentication with access token (15min) + refresh token (7d)
- Refresh tokens stored in MongoDB for revocation support (user logout invalidates all refresh tokens)
- Passwords hashed with bcrypt (12 rounds)

### Credential Encryption

Device credentials (username, password, notes) are encrypted with AES-256-GCM.

**Key management:**
- `ENCRYPTION_KEY` is generated on first boot via `crypto.randomBytes(32)` (256-bit random key)
- Stored at `/data/secrets/encryption.key` inside the API container's persistent volume, with file permissions `0600`
- The key is loaded into memory on API startup and never logged or exposed in environment variables
- **Warning:** If the persistent volume is lost and no backup exists, all stored device credentials become unrecoverable. The backup/restore mechanism is the recovery path.
- **Key rotation:** Not supported in v1. Future versions may implement re-encryption with a new key via a maintenance command.

### Network Security

- CORS configured for frontend origin only
- MongoDB requires authentication (username/password via environment variables)

### TLS/HTTPS

The application runs on HTTP internally. For production, users should place a reverse proxy (nginx, Traefik, Caddy) in front with TLS termination. The `docker-compose.yml` includes an optional commented-out Traefik service as a reference.

## Docker & Deploy

### Docker Compose Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| frontend | Next.js | 3000 | |
| api | NestJS | 4000 | Waits for mongodb, redis |
| worker | Python + nmap | — | network_mode: host, NET_ADMIN |
| mongodb | mongo:7 | 27017 | Named volume, authenticated |
| redis | redis:7-alpine | 6379 | Named volume |

### Monorepo Structure

```
iot-sentinel/
├── docker-compose.yml
├── docker-compose.dev.yml    (overrides for dev: volumes, watch mode)
├── .env.example
├── frontend/                 (Next.js)
├── api/                      (NestJS)
├── worker/                   (Python)
├── docs/
└── README.md
```

### First Boot Experience

1. `git clone` + `docker-compose up -d`
2. Access `http://localhost:3000` → redirects to `/setup`
3. Complete wizard (language, admin user, basic config)
4. Register first Local → Network → Run scan → Things appear

`.env.example` with sensible defaults:
```
# Infrastructure
MONGODB_URI=mongodb://sentinel:sentinel_secret@mongodb:27017/iot-sentinel?authSource=admin
REDIS_URL=redis://redis:6379

# MongoDB root credentials (used by mongo container on first boot)
MONGO_INITDB_ROOT_USERNAME=sentinel
MONGO_INITDB_ROOT_PASSWORD=sentinel_secret

# API
API_PORT=4000
FRONTEND_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Development

- `docker-compose.dev.yml` with volume mounts and watch mode for hot reload
- Multi-stage Dockerfiles for lean production images
- Worker mock mode on non-Linux platforms for development

## Testing & Quality

| Layer | Tool | Scope |
|-------|------|-------|
| API Unit | Jest | Services, business logic, crypto |
| API Integration | Jest + mongodb-memory-server | Full modules with in-memory MongoDB |
| API E2E | Jest + Supertest | HTTP endpoints end-to-end |
| Frontend Unit | Vitest + Testing Library | Components, hooks |
| Frontend E2E | Playwright | Full flows (login → register → scan) |
| Worker | Pytest | nmap result parsing logic |

**Code Quality:**
- ESLint + Prettier for code standardization
- Husky + lint-staged for pre-commit lint
- GitHub Actions CI running tests + lint on every PR
- Conventional Commits (`feat:`, `fix:`, `chore:`) for future changelog automation
