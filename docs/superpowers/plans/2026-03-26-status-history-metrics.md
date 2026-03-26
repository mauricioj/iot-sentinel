# Status History & Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record status transitions (online↔offline) for each Thing, store 30 days of history with TTL auto-cleanup, and display uptime timeline + metrics on Thing detail and dashboard pages.

**Architecture:** New `status-history` NestJS module with StatusEvent collection (TTL-indexed). Monitor and scanner processors record transitions when healthStatus changes. Frontend uses Recharts for uptime timeline visualization.

**Tech Stack:** NestJS/Mongoose (backend), Recharts (frontend charting), MongoDB TTL indexes.

---

### Task 1: Backend — StatusEvent Schema, Repository, Service

**Files:**
- Create: `api/src/status-history/schemas/status-event.schema.ts`
- Create: `api/src/status-history/status-history.repository.ts`
- Create: `api/src/status-history/status-history.service.ts`
- Create: `api/src/status-history/status-history.module.ts`

- [ ] **Step 1: Create StatusEvent schema**

```typescript
// api/src/status-history/schemas/status-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StatusEventDocument = HydratedDocument<StatusEvent>;

@Schema()
export class StatusEvent {
  @Prop({ type: Types.ObjectId, ref: 'Thing', required: true, index: true })
  thingId: Types.ObjectId;

  @Prop({ required: true })
  healthStatus: string;

  @Prop({ required: true })
  timestamp: Date;
}

export const StatusEventSchema = SchemaFactory.createForClass(StatusEvent);
// TTL: auto-delete after 30 days
StatusEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Compound index for per-device time-range queries
StatusEventSchema.index({ thingId: 1, timestamp: -1 });
```

- [ ] **Step 2: Create repository**

```typescript
// api/src/status-history/status-history.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StatusEvent, StatusEventDocument } from './schemas/status-event.schema';

@Injectable()
export class StatusHistoryRepository {
  constructor(@InjectModel(StatusEvent.name) private readonly model: Model<StatusEventDocument>) {}

  async create(thingId: string, healthStatus: string): Promise<StatusEventDocument> {
    return this.model.create({
      thingId: new Types.ObjectId(thingId),
      healthStatus,
      timestamp: new Date(),
    });
  }

  async findByThingId(thingId: string, since: Date): Promise<StatusEventDocument[]> {
    return this.model
      .find({ thingId: new Types.ObjectId(thingId), timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .exec();
  }

  async findLastBefore(thingId: string, before: Date): Promise<StatusEventDocument | null> {
    return this.model
      .findOne({ thingId: new Types.ObjectId(thingId), timestamp: { $lt: before } })
      .sort({ timestamp: -1 })
      .exec();
  }

  async findDistinctThingIds(since: Date): Promise<string[]> {
    const result = await this.model.distinct('thingId', { timestamp: { $gte: since } }).exec();
    return result.map((id: any) => id.toString());
  }

  getModel(): Model<StatusEventDocument> {
    return this.model;
  }
}
```

- [ ] **Step 3: Create service with uptime calculation**

```typescript
// api/src/status-history/status-history.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StatusHistoryRepository } from './status-history.repository';

@Injectable()
export class StatusHistoryService {
  private readonly logger = new Logger(StatusHistoryService.name);

  constructor(private readonly repository: StatusHistoryRepository) {}

  async recordTransition(thingId: string, healthStatus: string): Promise<void> {
    await this.repository.create(thingId, healthStatus);
  }

  async getHistory(thingId: string, range: string) {
    const since = this.parseRange(range);
    const events = await this.repository.findByThingId(thingId, since);
    const uptime = await this.calculateUptime(thingId, since, events);
    return { events, uptime };
  }

  async getAverageUptime(range: string) {
    const since = this.parseRange(range);
    const thingIds = await this.repository.findDistinctThingIds(since);
    if (thingIds.length === 0) return { averageUptimePercent: 0, thingCount: 0 };

    let totalUptime = 0;
    for (const thingId of thingIds) {
      const events = await this.repository.findByThingId(thingId, since);
      const { uptimePercent } = await this.calculateUptime(thingId, since, events);
      totalUptime += uptimePercent;
    }

    return {
      averageUptimePercent: Math.round((totalUptime / thingIds.length) * 10) / 10,
      thingCount: thingIds.length,
    };
  }

  private async calculateUptime(thingId: string, since: Date, events: any[]) {
    const now = new Date();
    const totalMs = now.getTime() - since.getTime();
    if (totalMs <= 0) return { uptimePercent: 0, totalOnline: 0, totalOffline: 0 };

    // Determine initial status from last event before the range
    const lastBefore = await this.repository.findLastBefore(thingId, since);
    let currentStatus = lastBefore?.healthStatus || 'unknown';
    let cursor = since.getTime();

    let onlineMs = 0;
    let offlineMs = 0;

    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      const duration = eventTime - cursor;
      if (currentStatus === 'online') onlineMs += duration;
      else offlineMs += duration;
      currentStatus = event.healthStatus;
      cursor = eventTime;
    }

    // Time from last event to now
    const remaining = now.getTime() - cursor;
    if (currentStatus === 'online') onlineMs += remaining;
    else offlineMs += remaining;

    const uptimePercent = Math.round((onlineMs / totalMs) * 1000) / 10;
    return {
      uptimePercent,
      totalOnline: Math.round(onlineMs / 1000),
      totalOffline: Math.round(offlineMs / 1000),
    };
  }

  private parseRange(range: string): Date {
    const now = new Date();
    switch (range) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '24h':
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
```

- [ ] **Step 4: Create module**

```typescript
// api/src/status-history/status-history.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusEvent, StatusEventSchema } from './schemas/status-event.schema';
import { StatusHistoryRepository } from './status-history.repository';
import { StatusHistoryService } from './status-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StatusEvent.name, schema: StatusEventSchema }]),
  ],
  providers: [StatusHistoryService, StatusHistoryRepository],
  exports: [StatusHistoryService, StatusHistoryRepository],
})
export class StatusHistoryModule {}
```

- [ ] **Step 5: Register in AppModule**

Add `StatusHistoryModule` import to `api/src/app.module.ts`.

- [ ] **Step 6: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/status-history/ api/src/app.module.ts
git commit -m "feat(status-history): add StatusEvent schema, repository, service with uptime calculation"
```

---

### Task 2: Backend — Wire Transitions into Monitor and Scanner

**Files:**
- Modify: `api/src/monitor/monitor.service.ts`
- Modify: `api/src/monitor/monitor.module.ts`
- Modify: `api/src/scanner/scanner.processor.ts`
- Modify: `api/src/scanner/scanner.module.ts`

- [ ] **Step 1: Update MonitorModule to import StatusHistoryModule**

In `api/src/monitor/monitor.module.ts`, add `StatusHistoryModule` to imports.

- [ ] **Step 2: Inject StatusHistoryService into MonitorService**

In `api/src/monitor/monitor.service.ts`, add to constructor:
```typescript
private readonly statusHistoryService: StatusHistoryService,
```
Add import from `'../status-history/status-history.service'`.

- [ ] **Step 3: Record transitions in processHealthCheck**

In `api/src/monitor/monitor.service.ts`, in the `processHealthCheck` loop, before the `updateOne` call, add:

```typescript
const oldHealth = (thing as any).healthStatus;
if (oldHealth !== newHealth) {
  await this.statusHistoryService.recordTransition(thing._id.toString(), newHealth);
}
```

Replace the existing block (lines 106-110):
```typescript
const newHealth = isOnline ? HealthStatus.ONLINE : HealthStatus.OFFLINE;
const oldHealth = (thing as any).healthStatus;
if (oldHealth !== newHealth) {
  await this.statusHistoryService.recordTransition(thing._id.toString(), newHealth);
}
await ThingModel.updateOne(
  { _id: thing._id },
  { $set: { healthStatus: newHealth, ...(isOnline ? { lastSeenAt: new Date() } : {}) } },
);
```

- [ ] **Step 4: Update ScannerModule to import StatusHistoryModule**

In `api/src/scanner/scanner.module.ts`, add `StatusHistoryModule` to imports.

- [ ] **Step 5: Inject StatusHistoryService into ScannerProcessor**

In `api/src/scanner/scanner.processor.ts`, add to constructor:
```typescript
private readonly statusHistoryService: StatusHistoryService,
```
Add import.

- [ ] **Step 6: Record transitions in scanner processor**

In `api/src/scanner/scanner.processor.ts`, in the existing thing update path (line 94-103), add before the update call:

```typescript
if (existing) {
  const oldHealth = (existing as any).healthStatus;
  if (oldHealth !== 'online') {
    await this.statusHistoryService.recordTransition(existing._id.toString(), 'online');
  }
  // existing update code...
}
```

- [ ] **Step 7: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/monitor/ api/src/scanner/
git commit -m "feat(status-history): record transitions from monitor and scanner"
```

---

### Task 3: Backend — API Endpoints for History and Uptime

**Files:**
- Modify: `api/src/things/things.controller.ts`
- Modify: `api/src/things/things.module.ts`
- Modify: `api/src/dashboard/dashboard.service.ts`
- Modify: `api/src/dashboard/dashboard.controller.ts`
- Modify: `api/src/dashboard/dashboard.module.ts`

- [ ] **Step 1: Add history endpoint to ThingsController**

In `api/src/things/things.controller.ts`, add:

```typescript
import { StatusHistoryService } from '../status-history/status-history.service';

// Add to constructor:
private readonly statusHistoryService: StatusHistoryService,

// Add endpoint (before the :id routes to avoid route conflicts):
@Get(':id/history')
@ApiOperation({ summary: 'Get status history and uptime for a thing' })
getHistory(@Param('id') id: string, @Query('range') range: string = '24h') {
  return this.statusHistoryService.getHistory(id, range);
}
```

- [ ] **Step 2: Update ThingsModule to import StatusHistoryModule**

In `api/src/things/things.module.ts`, add `StatusHistoryModule` to imports.

- [ ] **Step 3: Add uptime endpoint to DashboardController**

In `api/src/dashboard/dashboard.controller.ts`:

```typescript
@Get('uptime')
@ApiOperation({ summary: 'Get average uptime across all things' })
getUptime(@Query('range') range: string = '24h') {
  return this.dashboardService.getAverageUptime(range);
}
```

Add `Query` to the imports from `@nestjs/common`.

- [ ] **Step 4: Add getAverageUptime to DashboardService**

In `api/src/dashboard/dashboard.service.ts`:

```typescript
import { StatusHistoryService } from '../status-history/status-history.service';

// Add to constructor:
private readonly statusHistoryService: StatusHistoryService,

async getAverageUptime(range: string) {
  return this.statusHistoryService.getAverageUptime(range);
}
```

- [ ] **Step 5: Update DashboardModule to import StatusHistoryModule**

In `api/src/dashboard/dashboard.module.ts`, add `StatusHistoryModule` to imports.

- [ ] **Step 6: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/things/ api/src/dashboard/
git commit -m "feat: add history and uptime API endpoints"
```

---

### Task 4: Backend — Include StatusEvents in Backup

**Files:**
- Modify: `api/src/backup/backup.module.ts`
- Modify: `api/src/backup/backup.service.ts`

- [ ] **Step 1: Register StatusEvent model in BackupModule**

In `api/src/backup/backup.module.ts`, add to MongooseModule.forFeature:
```typescript
{ name: StatusEvent.name, schema: StatusEventSchema }
```
Add imports from `../status-history/schemas/status-event.schema`.

- [ ] **Step 2: Update BackupService**

In `api/src/backup/backup.service.ts`:
- Add `@InjectModel(StatusEvent.name) private readonly statusEventModel: Model<StatusEvent>` to constructor
- In `export()`: add `statusEvents: this.statusEventModel.find().lean().exec()` to Promise.all, include in backup object
- In `restore()`: add statusEvents restore block (deleteMany + insertMany)

- [ ] **Step 3: Run tests, commit**

```bash
cd api && npx jest --verbose
git add api/src/backup/
git commit -m "feat(backup): include status events in export/restore"
```

---

### Task 5: Frontend — Install Recharts, Add Types and Service

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/status-history.service.ts`

- [ ] **Step 1: Install Recharts**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Add types**

In `frontend/src/types/index.ts`, add:

```typescript
export interface StatusEvent {
  _id: string;
  thingId: string;
  healthStatus: 'online' | 'offline';
  timestamp: string;
}

export interface ThingHistory {
  events: StatusEvent[];
  uptime: {
    uptimePercent: number;
    totalOnline: number;
    totalOffline: number;
  };
}

export interface UptimeStats {
  averageUptimePercent: number;
  thingCount: number;
}
```

- [ ] **Step 3: Create service**

```typescript
// frontend/src/services/status-history.service.ts
import { api } from './api';
import { ThingHistory, UptimeStats } from '@/types';

export const statusHistoryService = {
  getHistory: (thingId: string, range: string = '24h') =>
    api<ThingHistory>(`/api/v1/things/${thingId}/history?range=${range}`),
  getAverageUptime: (range: string = '24h') =>
    api<UptimeStats>(`/api/v1/dashboard/uptime?range=${range}`),
};
```

- [ ] **Step 4: Build and commit**

```bash
cd frontend && npx next build
git add frontend/
git commit -m "feat(frontend): add recharts, status history types and service"
```

---

### Task 6: Frontend — UptimeBar and StatusHistoryCard Components

**Files:**
- Create: `frontend/src/components/things/uptime-bar.tsx`
- Create: `frontend/src/components/things/status-history-card.tsx`

- [ ] **Step 1: Create UptimeBar component**

```typescript
// frontend/src/components/things/uptime-bar.tsx
'use client';

import { useMemo } from 'react';
import { StatusEvent } from '@/types';

interface UptimeBarProps {
  events: StatusEvent[];
  rangeMs: number;
  rangeStart: Date;
}

export function UptimeBar({ events, rangeMs, rangeStart }: UptimeBarProps) {
  const segments = useMemo(() => {
    if (rangeMs <= 0) return [];
    const now = new Date();
    const start = rangeStart.getTime();
    const result: { status: string; startPct: number; widthPct: number }[] = [];

    let currentStatus = events.length > 0 ? 'unknown' : 'unknown';
    let cursor = start;

    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      if (eventTime > cursor) {
        const startPct = ((cursor - start) / rangeMs) * 100;
        const widthPct = ((eventTime - cursor) / rangeMs) * 100;
        result.push({ status: currentStatus, startPct, widthPct });
      }
      currentStatus = event.healthStatus;
      cursor = eventTime;
    }

    // Remaining time to now
    const endTime = Math.min(now.getTime(), start + rangeMs);
    if (cursor < endTime) {
      const startPct = ((cursor - start) / rangeMs) * 100;
      const widthPct = ((endTime - cursor) / rangeMs) * 100;
      result.push({ status: currentStatus, startPct, widthPct });
    }

    return result;
  }, [events, rangeMs, rangeStart]);

  const colorMap: Record<string, string> = {
    online: 'bg-success',
    offline: 'bg-destructive',
    unknown: 'bg-muted',
  };

  return (
    <div className="relative h-6 w-full rounded bg-muted overflow-hidden">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`absolute top-0 h-full ${colorMap[seg.status] || colorMap.unknown}`}
          style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
          title={`${seg.status} (${Math.round(seg.widthPct)}%)`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusHistoryCard component**

```typescript
// frontend/src/components/things/status-history-card.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UptimeBar } from './uptime-bar';
import { statusHistoryService } from '@/services/status-history.service';
import { ThingHistory } from '@/types';

const RANGES = [
  { value: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function StatusHistoryCard({ thingId }: { thingId: string }) {
  const [range, setRange] = useState('24h');
  const [history, setHistory] = useState<ThingHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statusHistoryService.getHistory(thingId, range);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [thingId, range]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const rangeConfig = RANGES.find((r) => r.value === range) || RANGES[0];
  const rangeStart = new Date(Date.now() - rangeConfig.ms);

  const uptimeColor = history
    ? history.uptime.uptimePercent >= 95 ? 'text-success'
    : history.uptime.uptimePercent >= 80 ? 'text-warning'
    : 'text-destructive'
    : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Status History</CardTitle>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : history ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className={`text-2xl font-bold ${uptimeColor}`}>
                {history.uptime.uptimePercent}%
              </span>
              <span className="text-sm text-muted-foreground">
                uptime ({rangeConfig.label})
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                Online: {formatDuration(history.uptime.totalOnline)} · Offline: {formatDuration(history.uptime.totalOffline)}
              </span>
            </div>

            <UptimeBar events={history.events} rangeMs={rangeConfig.ms} rangeStart={rangeStart} />

            {history.events.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Recent Events</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...history.events].reverse().slice(0, 20).map((event, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <span className={`h-2 w-2 rounded-full ${event.healthStatus === 'online' ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span className="capitalize">{event.healthStatus}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No status changes recorded in this period.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/components/things/
git commit -m "feat(frontend): add UptimeBar and StatusHistoryCard components"
```

---

### Task 7: Frontend — Wire Components into Thing Detail and Dashboard

**Files:**
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx`
- Modify: `frontend/src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Add StatusHistoryCard to Thing detail page**

In `frontend/src/app/(dashboard)/things/[id]/page.tsx`:

1. Add import: `import { StatusHistoryCard } from '@/components/things/status-history-card';`
2. Add the component after the Device Info card and before the Groups section:
```tsx
{/* Status History */}
{(thing as any).registrationStatus === 'registered' && (
  <StatusHistoryCard thingId={id} />
)}
```

Only show for registered things (discovered things aren't monitored).

- [ ] **Step 2: Add uptime card to Dashboard**

In `frontend/src/app/(dashboard)/page.tsx`:

1. Add import: `import { statusHistoryService } from '@/services/status-history.service';`
2. Add state: `const [uptime, setUptime] = useState<number | null>(null);`
3. In the useEffect, fetch uptime alongside stats:
```typescript
statusHistoryService.getAverageUptime('24h')
  .then((data) => setUptime(data.averageUptimePercent))
  .catch(() => {});
```
4. Add uptime card to the cards array (import `Activity` from lucide-react):
```typescript
{ title: 'Avg Uptime', value: uptime !== null ? `${uptime}%` : '-', icon: Activity, color: 'text-primary' },
```

- [ ] **Step 3: Build and commit**

```bash
cd frontend && npx next build
git add frontend/src/app/
git commit -m "feat(frontend): add status history to thing detail and uptime to dashboard"
```

---

### Task 8: Final Verification — Tests + Docker Builds

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

All 3 must pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "feat: status history and metrics — complete"
```
