# Batch Fixes v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 issues: split Thing status into registration+health, fix auth 401 handling, add tabs to edit modal, and make ThingType seed incremental.

**Architecture:** The status split replaces the single `status` enum with `registrationStatus` (discovered/registered) and `healthStatus` (online/offline/unknown). A new health checker thread in the worker pings registered Things periodically. Auth fix adds force-logout on failed refresh. Modal gets tabs. Seed checks for missing slugs.

**Tech Stack:** NestJS/Mongoose, Python worker (threading), Next.js React frontend.

---

### Task 1: Backend — Split Thing Status into Two Fields

**Files:**
- Modify: `api/src/things/schemas/thing.schema.ts`
- Modify: `api/src/things/dto/thing-query.dto.ts`
- Modify: `api/src/things/things.repository.ts`

- [ ] **Step 1: Replace ThingStatus enum with two new enums**

In `api/src/things/schemas/thing.schema.ts`, replace the `ThingStatus` enum with:

```typescript
export enum RegistrationStatus {
  DISCOVERED = 'discovered',
  REGISTERED = 'registered',
}

export enum HealthStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}
```

- [ ] **Step 2: Replace the status field on Thing class**

Remove:
```typescript
@Prop({ enum: ThingStatus, default: ThingStatus.UNKNOWN, index: true })
status: ThingStatus;
```

Replace with:
```typescript
@Prop({ enum: RegistrationStatus, default: RegistrationStatus.DISCOVERED, index: true })
registrationStatus: RegistrationStatus;

@Prop({ enum: HealthStatus, default: HealthStatus.UNKNOWN, index: true })
healthStatus: HealthStatus;
```

- [ ] **Step 3: Update ThingQueryDto**

In `api/src/things/dto/thing-query.dto.ts`:
- Remove `ThingStatus` import
- Add imports: `RegistrationStatus`, `HealthStatus`
- Replace the `status` field with two optional fields:

```typescript
@ApiPropertyOptional({ enum: RegistrationStatus })
@IsOptional() @IsEnum(RegistrationStatus)
registrationStatus?: RegistrationStatus;

@ApiPropertyOptional({ enum: HealthStatus })
@IsOptional() @IsEnum(HealthStatus)
healthStatus?: HealthStatus;
```

- [ ] **Step 4: Update ThingsRepository findAll query**

In `api/src/things/things.repository.ts`, in `findAll()` method:
- Remove the `if (query.status)` filter block
- Add:

```typescript
if (query.registrationStatus) {
  filter.registrationStatus = query.registrationStatus;
}
if (query.healthStatus) {
  filter.healthStatus = query.healthStatus;
}
```

- [ ] **Step 5: Update countByStatus to count both fields**

In `api/src/things/things.repository.ts`, replace `countByStatus()` with two methods:

```typescript
async countByRegistrationStatus(): Promise<Record<string, number>> {
  const results = await this.thingModel.aggregate([
    { $group: { _id: '$registrationStatus', count: { $sum: 1 } } },
  ]).exec();
  const counts: Record<string, number> = {};
  for (const r of results) counts[r._id] = r.count;
  return counts;
}

async countByHealthStatus(): Promise<Record<string, number>> {
  const results = await this.thingModel.aggregate([
    { $group: { _id: '$healthStatus', count: { $sum: 1 } } },
  ]).exec();
  const counts: Record<string, number> = {};
  for (const r of results) counts[r._id] = r.count;
  return counts;
}
```

- [ ] **Step 6: Run tests, fix any imports, commit**

```bash
cd api && npx jest --verbose
git add api/src/things/
git commit -m "refactor(things): split status into registrationStatus + healthStatus"
```

Note: Some tests and other files will break due to ThingStatus removal — we fix those in subsequent tasks.

---

### Task 2: Backend — Update Scanner, Monitor, Dashboard for New Status Fields

**Files:**
- Modify: `api/src/scanner/scanner.processor.ts`
- Modify: `api/src/things/things.service.ts`
- Modify: `api/src/monitor/monitor.service.ts`
- Modify: `api/src/monitor/monitor.controller.ts`
- Modify: `api/src/dashboard/dashboard.service.ts`
- Modify: `api/src/things/things.service.spec.ts`
- Modify: `api/src/scanner/scanner.service.spec.ts`

- [ ] **Step 1: Update scanner processor**

In `api/src/scanner/scanner.processor.ts`:
- Replace import `ThingStatus` with `RegistrationStatus, HealthStatus`
- **Existing things** (update path): change `status: ThingStatus.ONLINE` to `healthStatus: HealthStatus.ONLINE`
- **New things** (create path): change `status: ThingStatus.DISCOVERED` to `registrationStatus: RegistrationStatus.DISCOVERED, healthStatus: HealthStatus.UNKNOWN`

- [ ] **Step 2: Update things service — auto-register on edit**

In `api/src/things/things.service.ts`, modify the `update()` method:

```typescript
async update(id: string, dto: UpdateThingDto): Promise<Thing> {
  if (dto.credentials) {
    dto.credentials = this.encryptCredentials(dto.credentials);
  }
  // Auto-register discovered things when user edits them
  const existing = await this.thingsRepository.findById(id);
  if (!existing) throw new NotFoundException('Thing not found');
  const updateData: Record<string, unknown> = { ...dto };
  if (existing.registrationStatus === 'discovered') {
    updateData.registrationStatus = 'registered';
  }
  const thing = await this.thingsRepository.update(id, updateData);
  if (!thing) throw new NotFoundException('Thing not found');
  return thing;
}
```

- [ ] **Step 3: Add data migration in things service onModuleInit**

Add `OnModuleInit` to ThingsService. On startup, migrate old `status` field to new fields for existing documents:

```typescript
async onModuleInit() {
  // Migrate old status field to new registrationStatus + healthStatus
  const ThingModel = this.thingsRepository.getModel();
  const oldDocs = await ThingModel.find({ status: { $exists: true } }).exec();
  if (oldDocs.length > 0) {
    this.logger.log(`Migrating ${oldDocs.length} things from old status field...`);
    for (const doc of oldDocs) {
      const oldStatus = (doc as any).status;
      const regStatus = oldStatus === 'discovered' ? 'discovered' : 'registered';
      const healthStatus = oldStatus === 'online' ? 'online' : oldStatus === 'offline' ? 'offline' : 'unknown';
      await ThingModel.updateOne(
        { _id: doc._id },
        { $set: { registrationStatus: regStatus, healthStatus }, $unset: { status: 1 } },
      );
    }
    this.logger.log('Migration complete');
  }
}
```

Add a `getModel()` method to ThingsRepository that returns the model reference.

- [ ] **Step 4: Update monitor service**

In `api/src/monitor/monitor.service.ts`, replace `getStatus()`:

```typescript
async getStatus() {
  const [regCounts, healthCounts, total] = await Promise.all([
    this.thingsRepository.countByRegistrationStatus(),
    this.thingsRepository.countByHealthStatus(),
    this.thingsRepository.countTotal(),
  ]);
  return {
    total,
    registered: regCounts['registered'] || 0,
    discovered: regCounts['discovered'] || 0,
    online: healthCounts['online'] || 0,
    offline: healthCounts['offline'] || 0,
    unknown: healthCounts['unknown'] || 0,
  };
}
```

- [ ] **Step 5: Add networks-to-check endpoint**

In `api/src/monitor/monitor.service.ts`, add method:

```typescript
async getNetworksToCheck(): Promise<{ networkId: string; cidr: string }[]> {
  // Find networks that have at least one registered thing
  const networks = await this.thingsRepository.getModel()
    .aggregate([
      { $match: { registrationStatus: 'registered' } },
      { $group: { _id: '$networkId' } },
    ]).exec();
  const networkIds = networks.map((n: any) => n._id).filter(Boolean);
  // Get CIDRs from networks
  const result: { networkId: string; cidr: string }[] = [];
  for (const nid of networkIds) {
    const network = await this.networksRepository.findById(nid.toString());
    if (network) result.push({ networkId: nid.toString(), cidr: network.cidr });
  }
  return result;
}
```

Inject `NetworksRepository` into MonitorService. In `api/src/monitor/monitor.controller.ts`, add:

```typescript
@Get('networks-to-check')
@ApiOperation({ summary: 'Get networks with registered things for health checking' })
getNetworksToCheck() { return this.monitorService.getNetworksToCheck(); }
```

Import and inject NetworksModule/Repository into MonitorModule.

- [ ] **Step 6: Update dashboard service**

In `api/src/dashboard/dashboard.service.ts`, replace `getStats()`:

```typescript
async getStats() {
  const [totalThings, regCounts, healthCounts, { total: totalLocals }] = await Promise.all([
    this.thingsRepository.countTotal(),
    this.thingsRepository.countByRegistrationStatus(),
    this.thingsRepository.countByHealthStatus(),
    this.localsRepository.findAll(1, 1),
  ]);
  return {
    things: {
      total: totalThings,
      registered: regCounts['registered'] || 0,
      discovered: regCounts['discovered'] || 0,
      online: healthCounts['online'] || 0,
      offline: healthCounts['offline'] || 0,
      unknown: healthCounts['unknown'] || 0,
    },
    locals: { total: totalLocals },
  };
}
```

- [ ] **Step 7: Fix test files**

Update spec files that reference `ThingStatus`:
- `things.service.spec.ts`: replace `ThingStatus.CAMERA` or similar with string, replace `status` with `registrationStatus`/`healthStatus`
- `scanner.service.spec.ts`: update if it references ThingStatus

- [ ] **Step 8: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/
git commit -m "feat: update scanner, monitor, dashboard for split status fields"
```

---

### Task 3: Worker — Health Check Cron

**Files:**
- Create: `worker/src/health_checker.py`
- Modify: `worker/src/main.py`
- Modify: `worker/src/config.py`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add config for health check**

In `worker/src/config.py`, add:

```python
HEALTH_CHECK_INTERVAL = int(os.getenv('HEALTH_CHECK_INTERVAL', '300'))
API_INTERNAL_URL = os.getenv('API_INTERNAL_URL', 'http://localhost:9001')
```

- [ ] **Step 2: Create health_checker.py**

```python
"""Periodic health checker — pings registered Things to update online/offline status."""
import time
import json
import logging
import requests
import redis as redis_lib

from config import REDIS_URL, HEALTH_CHECK_INTERVAL, API_INTERNAL_URL, MOCK_MODE

logger = logging.getLogger(__name__)


def run_health_check_loop(r: redis_lib.Redis) -> None:
    """Background loop: periodically check health of registered things."""
    logger.info(f"Health checker started (interval: {HEALTH_CHECK_INTERVAL}s)")

    while True:
        try:
            time.sleep(HEALTH_CHECK_INTERVAL)
            logger.info("Running health check cycle...")

            # Get networks with registered things from API
            try:
                res = requests.get(f"{API_INTERNAL_URL}/api/v1/monitor/networks-to-check", timeout=10)
                if res.status_code != 200:
                    logger.warning(f"Failed to get networks: HTTP {res.status_code}")
                    continue
                networks = res.json()
            except requests.RequestException as e:
                logger.error(f"Failed to reach API: {e}")
                continue

            if not networks:
                logger.debug("No networks to check")
                continue

            # Import scanner dynamically based on mock mode
            if MOCK_MODE:
                from mock_scanner import scan_network
            else:
                from scanner import scan_network

            # Scan each network with status_check (fast ping sweep)
            all_hosts = []
            for net in networks:
                cidr = net.get('cidr')
                network_id = net.get('networkId')
                if not cidr:
                    continue
                logger.info(f"Health check scanning {cidr}")
                try:
                    hosts = scan_network(cidr, scan_type='status_check')
                    for h in hosts:
                        h['networkId'] = network_id
                    all_hosts.extend(hosts)
                except Exception as e:
                    logger.error(f"Health check scan failed for {cidr}: {e}")

            # Publish results via Redis pub/sub
            r.publish('health:check:completed', json.dumps({
                'hosts': all_hosts,
            }))
            logger.info(f"Health check complete: {len(all_hosts)} hosts found across {len(networks)} networks")

        except redis_lib.ConnectionError:
            logger.error("Redis connection lost in health checker, retrying in 10s...")
            time.sleep(10)
        except Exception as e:
            logger.error(f"Health check error: {e}")
            time.sleep(30)
```

- [ ] **Step 3: Update main.py to run health checker in a thread**

In `worker/src/main.py`, add at the top:

```python
import threading
from health_checker import run_health_check_loop
```

In the `main()` function, before the `consume_jobs(r)` call, add:

```python
# Start health checker in background thread
health_thread = threading.Thread(target=run_health_check_loop, args=(r,), daemon=True)
health_thread.start()
logger.info("Health checker thread started")
```

- [ ] **Step 4: Update docker-compose.yml**

Add `HEALTH_CHECK_INTERVAL` and `API_INTERNAL_URL` to worker environment in both `docker-compose.yml` and `docker-compose.prod.yml`:

```yaml
environment:
  REDIS_URL: redis://localhost:${REDIS_PORT:-9079}
  SCANNER_MOCK_MODE: ${SCANNER_MOCK_MODE:-auto}
  HEALTH_CHECK_INTERVAL: ${HEALTH_CHECK_INTERVAL:-300}
  API_INTERNAL_URL: http://localhost:${API_PORT:-9001}
```

Note: worker uses `network_mode: host`, so `localhost` resolves to the host's API port.

- [ ] **Step 5: Add `requests` to worker requirements**

In `worker/requirements.txt`, add:

```
requests==2.32.3
```

- [ ] **Step 6: Commit**

```bash
git add worker/ docker-compose.yml docker-compose.prod.yml
git commit -m "feat(worker): add periodic health check cron for registered things"
```

---

### Task 4: Backend — Health Check Result Processor

**Files:**
- Modify: `api/src/monitor/monitor.service.ts`

- [ ] **Step 1: Subscribe to health check results**

Add `OnModuleInit` and `OnModuleDestroy` to MonitorService. Subscribe to `health:check:completed` Redis channel (same pattern as ScannerProcessor):

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { HealthStatus } from '../things/schemas/thing.schema';

// In constructor, inject ConfigService
// In onModuleInit:
async onModuleInit() {
  const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:9079';
  this.subscriber = new Redis(redisUrl);
  this.subscriber.subscribe('health:check:completed', (err) => {
    if (err) this.logger.error(`Failed to subscribe: ${err.message}`);
    else this.logger.log('Subscribed to health:check:completed');
  });
  this.subscriber.on('message', async (channel, message) => {
    if (channel === 'health:check:completed') {
      try {
        const data = JSON.parse(message);
        await this.processHealthCheck(data.hosts || []);
      } catch (err) {
        this.logger.error(`Error processing health check: ${err}`);
      }
    }
  });
}
```

- [ ] **Step 2: Implement processHealthCheck**

```typescript
private async processHealthCheck(hosts: any[]) {
  // Build a set of discovered IPs and MACs
  const foundMacs = new Set(hosts.filter(h => h.macAddress).map(h => h.macAddress.toUpperCase()));
  const foundIps = new Set(hosts.filter(h => h.ipAddress).map(h => h.ipAddress));

  // Get all registered things
  const ThingModel = this.thingsRepository.getModel();
  const registeredThings = await ThingModel.find({ registrationStatus: 'registered' }).exec();

  let onlineCount = 0;
  let offlineCount = 0;

  for (const thing of registeredThings) {
    const macMatch = thing.macAddress && foundMacs.has(thing.macAddress.toUpperCase());
    const ipMatch = thing.ipAddress && foundIps.has(thing.ipAddress);
    const isOnline = macMatch || ipMatch;

    const newHealth = isOnline ? HealthStatus.ONLINE : HealthStatus.OFFLINE;
    if (thing.healthStatus !== newHealth || isOnline) {
      await ThingModel.updateOne(
        { _id: thing._id },
        {
          $set: {
            healthStatus: newHealth,
            ...(isOnline ? { lastSeenAt: new Date() } : {}),
          },
        },
      );
    }
    if (isOnline) onlineCount++; else offlineCount++;
  }

  this.logger.log(`Health check processed: ${onlineCount} online, ${offlineCount} offline`);
}
```

- [ ] **Step 3: Clean up onModuleDestroy**

```typescript
async onModuleDestroy() {
  if (this.subscriber) {
    await this.subscriber.unsubscribe('health:check:completed');
    await this.subscriber.quit();
  }
}
```

- [ ] **Step 4: Update MonitorModule imports**

Ensure MonitorModule imports `ConfigModule` and `NetworksModule` (for NetworksRepository).

- [ ] **Step 5: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/monitor/
git commit -m "feat(monitor): process health check results from worker"
```

---

### Task 5: Frontend — Update Types, StatusBadge, Dashboard for Split Status

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/ui/status-badge.tsx`
- Modify: `frontend/src/app/(dashboard)/page.tsx`
- Modify: `frontend/src/app/(dashboard)/things/page.tsx`
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx`

- [ ] **Step 1: Update Thing interface**

In `frontend/src/types/index.ts`:
- Remove `status: 'online' | 'offline' | 'unknown' | 'discovered'`
- Add:
```typescript
registrationStatus: 'discovered' | 'registered';
healthStatus: 'online' | 'offline' | 'unknown';
```

Update `DashboardStats` interface:
```typescript
export interface DashboardStats {
  things: {
    total: number;
    registered: number;
    discovered: number;
    online: number;
    offline: number;
    unknown: number;
  };
  locals: { total: number };
}
```

- [ ] **Step 2: Update StatusBadge**

In `frontend/src/components/ui/status-badge.tsx`, change to accept both fields:

```typescript
export function StatusBadge({ registrationStatus, healthStatus }: {
  registrationStatus: string;
  healthStatus: string;
}) {
  if (registrationStatus === 'discovered') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Search className="h-3 w-3" />
        Discovered
      </Badge>
    );
  }
  const config = healthConfig[healthStatus] || healthConfig.unknown;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

Where `healthConfig` maps `online`, `offline`, `unknown` to variants/icons.

- [ ] **Step 3: Update Things list page**

In `frontend/src/app/(dashboard)/things/page.tsx`:
- Update status column to pass both fields to StatusBadge
- Update status filter to offer two groups: registration (discovered/registered) and health (online/offline/unknown)
- Update filter params sent to API

- [ ] **Step 4: Update Thing detail page**

In `frontend/src/app/(dashboard)/things/[id]/page.tsx`:
- Update status display in info card to show both registrationStatus and healthStatus
- Pass both fields to StatusBadge

- [ ] **Step 5: Update Dashboard page**

In `frontend/src/app/(dashboard)/page.tsx`, update cards:

```typescript
const cards = [
  { title: 'Total Things', value: stats?.things.total ?? 0, icon: Box, color: 'text-primary' },
  { title: 'Registered', value: stats?.things.registered ?? 0, icon: CheckCircle, color: 'text-primary' },
  { title: 'Online', value: stats?.things.online ?? 0, icon: Wifi, color: 'text-success' },
  { title: 'Offline', value: stats?.things.offline ?? 0, icon: WifiOff, color: 'text-destructive' },
  { title: 'Discovered', value: stats?.things.discovered ?? 0, icon: Search, color: 'text-muted-foreground' },
];
```

- [ ] **Step 6: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/
git commit -m "feat(frontend): update UI for split registration + health status"
```

---

### Task 6: Fix Auth 401 Handling

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add forceLogout and update 401 handling**

In `frontend/src/services/api.ts`:

```typescript
function forceLogout() {
  accessToken = null;
  localStorage.removeItem('refreshToken');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// In the api() function, after the 401 retry block:
// If 401 persists after refresh attempt, force logout
if (res.status === 401 && accessToken) {
  const newToken = await refreshAccessToken();
  if (newToken) {
    headers['Authorization'] = `Bearer ${newToken}`;
    res = await fetch(path, { ...options, headers });
  }
  // If still 401 after refresh, force logout
  if (res.status === 401) {
    forceLogout();
    throw new Error('Session expired');
  }
}
```

Also update `refreshAccessToken`: if refresh request fails, call `forceLogout()` instead of just returning null.

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/services/api.ts
git commit -m "fix(auth): force logout and redirect on expired session"
```

---

### Task 7: Thing Edit Modal — Tabbed Layout

**Files:**
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx`

- [ ] **Step 1: Add tabs to edit modal**

In the edit modal section of `things/[id]/page.tsx`:

1. Add tab state: `const [editTab, setEditTab] = useState<'general' | 'credentials'>('general');`
2. Reset tab to 'general' when modal opens
3. Add tab buttons at the top of the modal form:

```tsx
<div className="flex gap-1 border-b border-border mb-4">
  <button type="button" onClick={() => setEditTab('general')}
    className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      editTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`}>General</button>
  <button type="button" onClick={() => setEditTab('credentials')}
    className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      editTab === 'credentials' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
    }`}>Credentials</button>
</div>
```

4. Wrap General fields (Name through Description) in `{editTab === 'general' && (...)}`
5. Wrap Credentials fields in `{editTab === 'credentials' && (...)}`
6. Add `max-h-[80vh] overflow-y-auto` to modal content

- [ ] **Step 2: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/\(dashboard\)/things/\[id\]/page.tsx
git commit -m "fix(things): tabbed edit modal to avoid overflow"
```

---

### Task 8: ThingType Seed — Incremental

**Files:**
- Modify: `api/src/thing-types/thing-types.service.ts`

- [ ] **Step 1: Replace seed logic**

In `api/src/thing-types/thing-types.service.ts`, replace the `onModuleInit` method:

```typescript
async onModuleInit() {
  let seeded = 0;
  for (const seedType of SEED_TYPES) {
    const exists = await this.repository.findBySlug(seedType.slug);
    if (!exists) {
      await this.repository.create({ ...seedType, isSystem: true });
      seeded++;
    }
  }
  if (seeded > 0) {
    this.logger.log(`Seeded ${seeded} new thing types`);
  }
}
```

- [ ] **Step 2: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/thing-types/thing-types.service.ts
git commit -m "fix(thing-types): incremental seed — add missing types on startup"
```

---

### Task 9: Final Verification — Docker Builds

**Files:** None (verification only)

- [ ] **Step 1: Run API tests**

```bash
cd api && npx jest --verbose
```

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npx next build
```

- [ ] **Step 3: Docker builds (REQUIRED)**

```bash
docker build -t test-api -f api/Dockerfile api/
docker build -t test-frontend -f frontend/Dockerfile frontend/
docker build -t test-worker -f worker/Dockerfile worker/
```

All 3 must pass. Fix any TypeScript strict errors before declaring complete.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: batch fixes v1 complete"
```
