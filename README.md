# IoT Sentinel

**Stop losing track of your devices.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/u/mauricioj)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

IoT Sentinel is an open-source, self-hosted platform for cataloging and monitoring your IoT devices and network infrastructure. Know exactly where every device is, what IP it currently holds, what credentials it uses, and whether it is online — across all your locations and VLANs.

---

## The Problem

You have a workshop, a server room, and a remote site. Across them: IP cameras, PLCs, managed switches, Raspberry Pis. Over time you lose track of:

- Which device has which IP right now (DHCP strikes again)
- Where you wrote down the login credentials
- Whether that camera in Building B is actually online
- What you even have on the `192.168.20.0/24` VLAN

IoT Sentinel fixes this.

---

## Features

- **Hierarchical inventory** — Locations → Networks/VLANs (CIDR) → Devices (Things)
- **Stable identity via MAC address** — survives DHCP reassignments
- **Encrypted credential storage** — AES-256-GCM, reveal-on-click in the UI
- **Network scanning** — nmap-based discovery, auto mock mode on Docker Desktop
- **Groups** — Transversal labels (Cameras, Switches, PLCs) with custom icons
- **Channels** — Model multi-output devices (PLCs with 26+ outputs)
- **Real-time status** — WebSocket push updates, monitor checks
- **Notification rules** — Alert on status change, offline duration, or new discovery
- **Dark theme UI** — Grafana/Datadog-inspired, React Flow network map
- **Backup & restore** — Password-protected compressed exports
- **Setup wizard** — First-boot admin creation, zero manual config
- **One-command start** — `docker compose up -d` and you're done

---

## Screenshots

<!-- Screenshots will be added here -->
<!--
![Dashboard](docs/screenshots/dashboard.png)
![Device List](docs/screenshots/things.png)
![Network Map](docs/screenshots/network-map.png)
![Scanner](docs/screenshots/scanner.png)
-->

_Screenshots coming soon._

---

## Quick Start

**Requirements:** Docker and Docker Compose (Docker Desktop on Windows/macOS)

```bash
# 1. Pull the compose file
curl -O https://raw.githubusercontent.com/mauricioj/iot-sentinel/main/docker-compose.prod.yml

# 2. Start everything
docker compose -f docker-compose.prod.yml up -d

# 3. Open the app
# http://localhost:3000 → Setup wizard → Create admin → Done
```

That's it. MongoDB and Redis are included. No external dependencies.

> **Note:** On first boot, the setup wizard creates your admin account. The encryption key for credentials is auto-generated and persisted in a Docker volume.

---

## Development Setup

```bash
# Clone
git clone https://github.com/mauricioj/iot-sentinel.git
cd iot-sentinel

# Copy environment template
cp .env.example .env

# Start with hot reload (source-mounted volumes, mock scanner)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Services will start with:
- **Frontend** (Next.js) on `http://localhost:3000` — hot reload via volume mount
- **API** (NestJS) on `http://localhost:4000` — `nodemon` watch mode
- **Worker** (Python) — mock scanner enabled (`SCANNER_MOCK_MODE=true`)
- **MongoDB** on `localhost:27017`
- **Redis** on `localhost:6379`

### Running Tests

```bash
cd api

# Unit tests (42 tests)
npx jest --verbose

# E2E tests using mongodb-memory-server (20 tests)
npx jest --config test/jest-e2e.config.ts --forceExit
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / WebSocket
                        ▼
┌───────────────────────────────────────────────────── │
│  frontend  (Next.js 14, App Router, Tailwind v4)     │
│  :3000                                               │
└───────────────────────┬─────────────────────────────┘
                        │ REST API / WS
                        ▼
┌─────────────────────────────────────────────────────┐
│  api  (NestJS 10, TypeScript)                        │
│  :4000  →  /api/v1/*   Swagger: /api/docs            │
└────────┬────────────────────────┬───────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────────────────┐
│  mongodb  :27017│    │  redis  :6379               │
│  (persistence)  │    │  (queues + pub/sub)          │
└─────────────────┘    └──────────────┬──────────────┘
                                       │ Bull jobs
                                       ▼
                       ┌─────────────────────────────┐
                       │  worker  (Python 3.11, nmap) │
                       │  network_mode: host           │
                       │  auto mock on Docker Desktop │
                       └─────────────────────────────┘
```

**Data flow for a scan:** API enqueues a Bull job to Redis → Worker dequeues, runs nmap → Worker publishes result to Redis pub/sub → API receives result, updates MongoDB, pushes to frontend via WebSocket.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v4, Lucide React, React Flow |
| Backend | NestJS 10, TypeScript, Mongoose, Bull (Redis queues), Socket.IO, JWT, Swagger |
| Scanner | Python 3.11, python-nmap |
| Database | MongoDB 7 |
| Cache / Queue | Redis 7 |
| Infrastructure | Docker, Docker Compose |

---

## Project Structure

```
iot-sentinel/
├── api/                    # NestJS backend
│   └── src/
│       ├── auth/           # JWT authentication
│       ├── locals/         # Physical locations
│       ├── networks/       # VLANs and CIDR ranges
│       ├── things/         # Device registry
│       ├── groups/         # Transversal device groups
│       ├── scanner/        # Network scan orchestration
│       ├── monitor/        # Device status checks
│       ├── notifications/  # Rules and WebSocket push
│       ├── backup/         # Export/restore
│       ├── settings/       # App config + setup wizard
│       ├── dashboard/      # Stats aggregation
│       └── crypto/         # AES-256-GCM encryption
│
├── frontend/               # Next.js frontend
│   └── src/
│       ├── app/            # App Router pages
│       │   ├── (dashboard)/
│       │   ├── login/
│       │   └── setup/
│       ├── components/     # UI and domain components
│       ├── services/       # API client layer
│       ├── contexts/       # React context providers
│       └── hooks/          # Custom hooks
│
├── worker/                 # Python nmap scanner
│   └── src/
│
├── docker-compose.yml          # Base compose (build from source)
├── docker-compose.prod.yml     # Production (Docker Hub images)
└── docker-compose.dev.yml      # Dev overrides (hot reload)
```

---

## API Documentation

The API is documented with Swagger/OpenAPI. Once the stack is running, visit:

```
http://localhost:4000/api/docs
```

All endpoints are prefixed with `/api/v1/`. Key resource paths:

| Resource | Base path |
|---|---|
| Auth | `/api/v1/auth` |
| Locations | `/api/v1/locals` |
| Networks | `/api/v1/locals/:id/networks` |
| Devices | `/api/v1/things` |
| Groups | `/api/v1/groups` |
| Scanner | `/api/v1/scanner` |
| Notifications | `/api/v1/notifications` |
| Backup | `/api/v1/backup` |
| Dashboard | `/api/v1/dashboard/stats` |
| Health | `/health` |

---

## Docker Hub Images

Pre-built images are published to Docker Hub under the `mauricioj/` namespace:

| Image | Tag |
|---|---|
| `mauricioj/api` | `latest` |
| `mauricioj/frontend` | `latest` |
| `mauricioj/worker` | `latest` |

---

## Environment Variables

Key variables used by `docker-compose.prod.yml` (all have defaults for local use):

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `change-me-in-production-please` | **Change this in production** |
| `MONGO_INITDB_ROOT_USERNAME` | `sentinel` | MongoDB root user |
| `MONGO_INITDB_ROOT_PASSWORD` | `sentinel_secret` | MongoDB root password |
| `SCANNER_MOCK_MODE` | `auto` | `true` / `false` / `auto` (auto-detects Docker Desktop) |
| `API_PORT` | `4000` | Host port for the API |
| `FRONTEND_URL` | `http://localhost:3000` | Used for CORS |

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes with tests where applicable
4. Run the test suite (`cd api && npx jest`)
5. Open a pull request

Please keep PRs focused — one feature or fix per PR. For larger changes, open an issue first to discuss the approach.

---

## License

MIT — see [LICENSE](LICENSE).
