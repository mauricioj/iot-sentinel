# Status History & Metrics

## Context

IoT Sentinel tracks device health (online/offline) via periodic health checks, but only stores the current state. There's no history of status changes, no uptime calculation, and no visual timeline. Users want to see when a device went offline, how long it stayed down, and overall uptime metrics — similar to Grafana status panels.

## Data Model

### StatusEvent Collection (new)

```
StatusEvent {
  thingId: ObjectId        // Reference to Thing, indexed
  healthStatus: string     // 'online' | 'offline'
  timestamp: Date          // When the transition happened, indexed with TTL
}
```

**Key design decisions:**
- Only records **transitions** (status changes), not every health check. If a device is online and stays online, no new event is created. This keeps volume low.
- TTL index on `timestamp` with 30 days expiry — MongoDB auto-deletes old records.
- Index: `{ thingId: 1, timestamp: -1 }` for efficient per-device queries sorted by time.

**Volume estimate:** With 100 devices averaging 2 transitions/day (one outage), that's ~6,000 records/month. Negligible.

## Backend

### New Module: `status-history`

**Files:**
- `api/src/status-history/schemas/status-event.schema.ts`
- `api/src/status-history/status-history.repository.ts`
- `api/src/status-history/status-history.service.ts`
- `api/src/status-history/status-history.module.ts`

**Schema:**

```typescript
@Schema()
export class StatusEvent {
  @Prop({ type: Types.ObjectId, ref: 'Thing', required: true, index: true })
  thingId: Types.ObjectId;

  @Prop({ required: true })
  healthStatus: string;

  @Prop({ required: true, index: true })
  timestamp: Date;
}

// TTL index: auto-delete after 30 days
StatusEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Compound index for per-device queries
StatusEventSchema.index({ thingId: 1, timestamp: -1 });
```

**Service methods:**

```typescript
recordTransition(thingId: string, healthStatus: string): Promise<void>
// Creates a StatusEvent document

getHistory(thingId: string, range: '24h' | '7d' | '30d'): Promise<StatusEvent[]>
// Returns all events for a thing within the time range, sorted by timestamp desc

getUptime(thingId: string, range: '24h' | '7d' | '30d'): Promise<{ uptimePercent: number; totalOnline: number; totalOffline: number }>
// Calculates uptime percentage by walking through events and summing online/offline durations

getAverageUptime(range: '24h' | '7d' | '30d'): Promise<{ averageUptimePercent: number; thingCount: number }>
// Calculates average uptime across all registered things
```

### Monitor Service Change

In `api/src/monitor/monitor.service.ts`, method `processHealthCheck`:

When updating a Thing's healthStatus, compare old vs new. If different → call `statusHistoryService.recordTransition(thingId, newStatus)`.

```typescript
// Before:
await ThingModel.updateOne({ _id: thing._id }, { $set: { healthStatus: newHealth } });

// After:
if (thing.healthStatus !== newHealth) {
  await this.statusHistoryService.recordTransition(thing._id.toString(), newHealth);
}
await ThingModel.updateOne({ _id: thing._id }, { $set: { healthStatus: newHealth } });
```

### Scanner Processor Change

In `api/src/scanner/scanner.processor.ts`: when scanner marks existing things as online, also record transition if status changed.

### API Endpoints

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| GET | `/api/v1/things/:id/history?range=24h` | JWT | `{ events: StatusEvent[], uptime: { uptimePercent, totalOnline, totalOffline } }` |
| GET | `/api/v1/dashboard/uptime?range=24h` | JWT | `{ averageUptimePercent, thingCount }` |

The history endpoint returns both the raw events and the computed uptime in a single call to avoid two round-trips.

**Range parameter:** `24h` (default), `7d`, `30d`. Parsed server-side to a `Date` filter.

### Uptime Calculation Algorithm

Given a list of StatusEvents sorted by timestamp ascending within a range:

1. Start from range start time
2. Determine initial status: look at the last event BEFORE the range start (or assume 'unknown')
3. Walk through events, accumulate time in each status
4. Last event to range end: continue the last known status
5. `uptimePercent = totalOnlineMs / totalRangeMs * 100`

## Frontend

### Charting Library

Add **Recharts** (`recharts`) — lightweight, React-native, good time-series support.

### Thing Detail Page — Status History Section

New card section after "Device Info", before "Channels":

```
┌─ Status History ────────────────────────────────┐
│  ⏱ 99.2% uptime    [24h] [7d] [30d]           │
│                                                  │
│  ████████████████░░████████████████████████████  │
│  (green = online, red = offline, timeline bar)   │
│                                                  │
│  Recent Events:                                  │
│  2026-03-26 14:30  ● Online                     │
│  2026-03-26 14:15  ● Offline (15min)            │
│  2026-03-26 08:00  ● Online                     │
└──────────────────────────────────────────────────┘
```

**Components:**
- **UptimeBar**: Horizontal bar chart using Recharts `BarChart` with stacked segments. Each segment = a period of online or offline.
- **UptimePercent**: Big number with color (green >95%, yellow >80%, red <80%)
- **TimeRangeSelector**: 3 buttons (24h/7d/30d), controls the API call
- **EventList**: Simple table of recent transitions with relative timestamps and duration

### Dashboard — Uptime Card

Add a new card to the dashboard grid:

```
┌─────────────┐
│ Avg Uptime  │
│   97.3%     │
│  ▁▃▅▇█▇▅▃  │ (optional mini sparkline, v2)
└─────────────┘
```

Fetches from `GET /api/v1/dashboard/uptime?range=24h`.

### Frontend Types

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
```

## Files to Create/Modify

### New files (backend)
- `api/src/status-history/schemas/status-event.schema.ts`
- `api/src/status-history/status-history.repository.ts`
- `api/src/status-history/status-history.service.ts`
- `api/src/status-history/status-history.module.ts`

### New files (frontend)
- `frontend/src/components/things/uptime-bar.tsx` — Recharts uptime visualization
- `frontend/src/components/things/status-history-card.tsx` — complete history section
- `frontend/src/services/status-history.service.ts`

### Modified files (backend)
- `api/src/app.module.ts` — register StatusHistoryModule
- `api/src/monitor/monitor.service.ts` — record transitions on health change
- `api/src/monitor/monitor.module.ts` — import StatusHistoryModule
- `api/src/scanner/scanner.processor.ts` — record transitions on scan discovery
- `api/src/scanner/scanner.module.ts` — import StatusHistoryModule
- `api/src/things/things.controller.ts` — add history endpoint
- `api/src/dashboard/dashboard.service.ts` — add uptime stats
- `api/src/dashboard/dashboard.controller.ts` — add uptime endpoint
- `api/src/dashboard/dashboard.module.ts` — import StatusHistoryModule
- `api/src/backup/backup.service.ts` — include StatusEvents in export/restore
- `api/src/backup/backup.module.ts` — register StatusEvent model

### Modified files (frontend)
- `frontend/package.json` — add recharts
- `frontend/src/types/index.ts` — add StatusEvent, ThingHistory interfaces
- `frontend/src/app/(dashboard)/things/[id]/page.tsx` — add StatusHistoryCard
- `frontend/src/app/(dashboard)/page.tsx` — add uptime card

## What NOT to Do

- Do not record an event on every health check — only on transitions
- Do not build a separate metrics page yet — detalhe + dashboard is enough for v1
- Do not add response time/latency metrics — focus on online/offline status only
- Do not add per-port status tracking — that's a future enhancement
- Do not store events beyond 30 days — TTL handles cleanup automatically
