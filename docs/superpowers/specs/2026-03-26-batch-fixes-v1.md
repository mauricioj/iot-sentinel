# Batch Fixes v1: Status Split, Auth, Modal, Seed

## Context

After deploying the ThingType CRUD feature and testing the full flow, four issues were identified:

1. Things stay "Discovered" forever — no mechanism to transition to online/offline after user registers them
2. Token expiration causes silent 401 errors without redirect to login
3. Thing edit modal is too large, hiding the save button on smaller screens
4. ThingType seed only runs on empty database — new system types added in updates are never created

## Fix 1: Separate Registration Status and Health Status

### Problem

The single `status` field (`online | offline | unknown | discovered`) conflates two concerns: whether a device has been registered by the user, and whether it's currently reachable on the network.

### Solution

Replace the single `status` field with two fields:

**`registrationStatus`**: `'discovered'` | `'registered'`
- Set to `discovered` when scanner creates a new Thing
- Automatically changes to `registered` when a user edits any field on a discovered Thing
- Never changes back to `discovered`

**`healthStatus`**: `'online'` | `'offline'` | `'unknown'`
- Default: `unknown`
- Updated by the worker health check cron
- Only monitored for Things with `registrationStatus === 'registered'`
- Things with `registrationStatus === 'discovered'` always show `unknown`

### Schema Changes

**`api/src/things/schemas/thing.schema.ts`:**
- Remove `ThingStatus` enum
- Add two new enums: `RegistrationStatus` and `HealthStatus`
- Replace `status` field with `registrationStatus` (default `'discovered'`, indexed) and `healthStatus` (default `'unknown'`, indexed)

### Data Migration

Existing Things with `status`:
- `discovered` → `registrationStatus: 'discovered'`, `healthStatus: 'unknown'`
- `online` → `registrationStatus: 'registered'`, `healthStatus: 'online'`
- `offline` → `registrationStatus: 'registered'`, `healthStatus: 'offline'`
- `unknown` → `registrationStatus: 'registered'`, `healthStatus: 'unknown'`

This migration runs once on startup (in ThingsService `onModuleInit`) if any Thing still has the old `status` field.

### Scanner Processor Changes

**`api/src/scanner/scanner.processor.ts`:**
- New Things: `registrationStatus: 'discovered'`, `healthStatus: 'unknown'`
- Existing registered Things found in scan: update `healthStatus: 'online'`, `lastSeenAt: now`
- Do NOT change `registrationStatus` — scanner never re-discovers a registered thing

### Things Service Changes

**`api/src/things/things.service.ts`:**
- On `update()`: if the Thing has `registrationStatus === 'discovered'`, automatically set `registrationStatus: 'registered'`

### Worker Health Check Cron

**New file: `worker/src/health_checker.py`**

A background loop in the worker process:
1. Every N minutes (configurable via `HEALTH_CHECK_INTERVAL` env var, default 300 seconds / 5 min)
2. Query the API for all networks that have registered Things (new endpoint: `GET /api/v1/monitor/networks-to-check`)
3. For each network CIDR, run `status_check` scan (ping sweep, fast)
4. Compare discovered IPs/MACs with registered Things
5. Publish health results via Redis pub/sub channel `health:check:completed`

**`api/src/monitor/monitor.service.ts`** (or new processor):
- Subscribe to `health:check:completed`
- For each registered Thing: if found in scan results → `healthStatus: 'online'`, else → `healthStatus: 'offline'`
- Update `lastSeenAt` for online Things

**New API endpoint:**
- `GET /api/v1/monitor/networks-to-check` — returns list of network CIDRs that have at least one registered Thing (used by worker)

**`worker/src/main.py`:**
- Add a second thread/loop for health checking alongside the existing Bull queue consumer

### Frontend Changes

**`frontend/src/types/index.ts`:**
- Thing interface: replace `status` with `registrationStatus` and `healthStatus`

**`frontend/src/components/ui/status-badge.tsx`:**
- Accept both `registrationStatus` and `healthStatus`
- Show "Discovered" badge for discovered things
- Show "Online"/"Offline"/"Unknown" health badge for registered things

**Things list and detail pages:**
- Filters adapt: status filter shows registration + health options
- Detail page shows both statuses
- Dashboard stats adapt to new fields

### Settings

`HEALTH_CHECK_INTERVAL` env var (seconds) passed to worker container, default 300.

---

## Fix 2: Auth 401 Handling + Redirect

### Problem

When tokens expire mid-session, the user gets silent 401 errors. The refresh attempt may fail but the user isn't redirected to login.

### Solution

**`frontend/src/services/api.ts`:**
- After the 401 retry with refreshed token: if the second request also returns 401, clear tokens from localStorage and redirect to `/login`
- Add a `forceLogout()` function that clears `accessToken`, removes `refreshToken` from localStorage, and does `window.location.href = '/login'`

**`frontend/src/contexts/auth-context.tsx`:**
- In `tryRestoreSession`: when refresh fails, ensure state is fully cleared (already removes refreshToken, just confirm accessToken is also null)

No toast needed — the redirect to login is clear enough.

---

## Fix 3: Thing Edit Modal — Tabbed Layout

### Problem

The edit modal has 11 fields stacked vertically, overflowing on smaller screens and hiding the save button.

### Solution

Split the edit modal into **2 tabs**:
- **General tab**: Name, Type, Network, MAC Address, IP Address, Vendor, OS, Description
- **Credentials tab**: Username, Password, Notes

Add `max-h-[80vh] overflow-y-auto` to the modal content area.

Implementation: simple tab state (`'general' | 'credentials'`), two tab buttons at the top of the modal form, conditional rendering of field groups.

---

## Fix 4: ThingType Seed — Incremental

### Problem

`onModuleInit` only seeds when `count() === 0`. New system types added in code updates are never created in existing deployments.

### Solution

Change seed logic to check for missing slugs:

```
For each type in SEED_TYPES:
  if no ThingType exists with this slug → create it with isSystem: true
```

Does NOT upsert — respects user customizations to existing types. Only inserts truly new types.

---

## Files to Modify/Create

### Fix 1 (status split)
- Modify: `api/src/things/schemas/thing.schema.ts` — new enums, new fields, remove old
- Modify: `api/src/things/things.service.ts` — auto-register on edit, migration
- Modify: `api/src/things/things.repository.ts` — query updates for new fields
- Modify: `api/src/things/dto/thing-query.dto.ts` — filter by registrationStatus/healthStatus
- Modify: `api/src/scanner/scanner.processor.ts` — use new fields
- Modify: `api/src/monitor/monitor.service.ts` — health update logic, new endpoint
- Modify: `api/src/monitor/monitor.controller.ts` — networks-to-check endpoint
- Modify: `api/src/dashboard/dashboard.service.ts` — stats by new fields
- Create: `worker/src/health_checker.py` — cron health check loop
- Modify: `worker/src/main.py` — add health check thread
- Modify: `frontend/src/types/index.ts` — Thing interface
- Modify: `frontend/src/components/ui/status-badge.tsx` — dual status display
- Modify: `frontend/src/app/(dashboard)/things/page.tsx` — filters, display
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx` — detail display
- Modify: `frontend/src/app/(dashboard)/page.tsx` — dashboard stats
- Modify: `api/src/backup/backup.service.ts` — handle old/new format on restore
- Modify: `docker-compose.yml` — HEALTH_CHECK_INTERVAL env for worker

### Fix 2 (auth)
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/contexts/auth-context.tsx`

### Fix 3 (modal tabs)
- Modify: `frontend/src/app/(dashboard)/things/[id]/page.tsx`

### Fix 4 (seed)
- Modify: `api/src/thing-types/thing-types.service.ts`
