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
| macAddress | string | Primary stable identifier |
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

| Field | Type | Description |
|-------|------|-------------|
| username | string | Encrypted |
| password | string | Encrypted with AES-256 |
| notes | string | Optional, encrypted |

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
| startedAt | Date | When execution began |
| completedAt | Date | When execution finished |
| results | object | Things found, changes detected |
| triggeredBy | enum | manual, scheduled |
| createdAt | Date | Auto-generated |

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

### Data Hierarchy

```
Local (casa, empresa)
  └── Network/VLAN (VLAN 10 - IoT, VLAN 20 - Cameras)
       └── Thing (Sonoff, camera, NVR, PLC)
            ├── Channels (PLC outputs, DVR inputs)
            └── Groups (transversal tags: "Cameras", "Switches")
```

## API Design

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
└── common/        → Filters, interceptors, base DTOs
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

### Endpoints

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/login`, `POST /auth/refresh` |
| Users | CRUD `/users` |
| Locals | CRUD `/locals` |
| Networks | CRUD `/locals/:id/networks` |
| Things | CRUD `/things`, `GET /things/search?q=`, `GET /things?groupId=&networkId=&status=` |
| Groups | CRUD `/groups`, `GET /groups/:id/things` |
| Scanner | `POST /scanner/discover`, `GET /scanner/jobs`, `GET /scanner/jobs/:id` |
| Monitor | `GET /monitor/status`, `POST /monitor/check/:thingId` |
| Notifications | CRUD `/notifications/rules`, `GET /notifications`, `PATCH /notifications/:id/read` |
| Backup | `POST /backup/export`, `POST /backup/restore`, `GET /backup/history` |
| Settings | `GET /settings`, `PATCH /settings` |
| Setup | `GET /setup/status`, `POST /setup/complete` |
| Dashboard | `GET /dashboard/stats` |

**Cross-cutting:**
- JWT authentication: access token (15min) + refresh token (7d)
- Swagger/OpenAPI auto-generated
- WebSocket gateway for real-time push (status changes, scan completion, notifications)

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
    → Publishes result: [{mac, ip, hostname, ports[], services[]}]
    → NestJS receives, matches MAC against existing things
        → Known MAC: updates IP, ports, status, lastSeenAt
        → New MAC: creates thing with status "discovered" (pending user action)
```

### Docker Configuration

- Runs with `network_mode: host` (required for nmap to see the host's real network)
- `NET_ADMIN` capability for raw sockets
- Status checks are lightweight (ping only) to avoid network congestion

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
  → Re-encrypt with user-provided backup password (AES-256)
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

- JWT-based authentication with access + refresh tokens
- Passwords hashed with bcrypt
- Device credentials encrypted with AES-256
- `ENCRYPTION_KEY` auto-generated on first boot, stored in persistent volume
- Backup files protected with user-defined password
- CORS configured for frontend origin only

## Docker & Deploy

### Docker Compose Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| frontend | Next.js | 3000 | |
| api | NestJS | 4000 | Waits for mongodb, redis |
| worker | Python + nmap | — | network_mode: host, NET_ADMIN |
| mongodb | mongo:7 | 27017 | Named volume for persistence |
| redis | redis:7-alpine | 6379 | Named volume for persistence |

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

Minimal `.env` with infrastructure-only defaults:
```
MONGODB_URI=mongodb://mongodb:27017/iot-sentinel
REDIS_URL=redis://redis:6379
```

### Development

- `docker-compose.dev.yml` with volume mounts and watch mode for hot reload
- Multi-stage Dockerfiles for lean production images

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
