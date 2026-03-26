# ThingType CRUD with Capabilities

## Context

ThingType is currently a hardcoded enum in the backend (8 values) that doesn't match the frontend (13 values), causing validation errors (e.g., "printer" is rejected). Types don't drive any behavior — they're just labels. The user wants types to be a CRUD entity with configurable capabilities that control what features are available per device type (channels for PLCs, port scan for servers, credentials for managed devices).

## Data Model

### ThingType Collection (new)

```
ThingType {
  name: string              // "Camera", "Server", "PLC" — display name
  slug: string              // "camera", "server", "plc" — unique, used as reference
  icon: string              // Lucide icon name ("camera", "server", "cpu")
  color: string             // Hex color "#3b82f6"
  capabilities: {
    enableChannels: boolean     // Show Channels section in Thing detail
    enablePortScan: boolean     // Show "Deep Scan" button in Thing detail
    enableCredentials: boolean  // Show Credentials section in Thing detail
  }
  isSystem: boolean         // true = seeded, cannot be deleted
  createdAt, updatedAt
}
```

### Thing Schema Change

- Remove `ThingType` enum entirely
- Field `type` changes from `@IsEnum(ThingType)` to `@IsString()` (stores the slug)
- Default remains `'other'`

### Migration

Existing Things with old enum values (camera, switch, sensor, nvr, vm, service, plc, other) map directly to the new slugs — no data migration needed since the string values are preserved.

## Seed Data

Created on first boot (setup). All have `isSystem: true`.

| slug | name | icon | color | channels | portScan | credentials |
|------|------|------|-------|----------|----------|-------------|
| router | Router | router | #6366f1 | false | false | true |
| switch | Switch | git-branch | #8b5cf6 | false | false | true |
| access-point | Access Point | wifi | #06b6d4 | false | false | true |
| firewall | Firewall | shield | #ef4444 | false | true | true |
| server | Server | server | #3b82f6 | false | true | true |
| workstation | Workstation | monitor | #64748b | false | true | true |
| vm | VM | box | #a855f7 | false | true | true |
| nas | NAS | database | #0ea5e9 | false | true | true |
| nvr | NVR | hard-drive | #7c3aed | false | false | true |
| camera | Camera | camera | #f59e0b | false | false | true |
| printer | Printer | printer | #78716c | false | false | false |
| smart-tv | Smart TV | tv | #ec4899 | false | false | false |
| sensor | Sensor | thermometer | #10b981 | false | false | false |
| plc | PLC | cpu | #f97316 | true | false | true |
| hmi | HMI | tablet | #d946ef | false | false | true |
| gateway | Gateway | network | #14b8a6 | false | false | true |
| service | Service | cloud | #6366f1 | false | true | true |
| other | Other | help-circle | #94a3b8 | false | false | false |

## API Endpoints

### ThingType CRUD

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/thing-types` | JWT | List all (paginated) |
| GET | `/api/v1/thing-types/:id` | JWT | Get by ID |
| POST | `/api/v1/thing-types` | Admin | Create custom type |
| PATCH | `/api/v1/thing-types/:id` | Admin | Edit (including isSystem types) |
| DELETE | `/api/v1/thing-types/:id` | Admin | Only if `isSystem === false` AND no Things reference this slug |

### DTO

**CreateThingTypeDto:**
- `name` (required, string, 1-50 chars)
- `slug` (required, string, lowercase + hyphens, unique)
- `icon` (optional, defaults to "help-circle")
- `color` (optional, defaults to "#94a3b8")
- `capabilities` (optional, object with 3 booleans, all default false)

**UpdateThingTypeDto:** PartialType of Create.

### Seed Logic

On application startup (`onModuleInit`), check if any ThingTypes exist. If none, insert the seed data. This runs only once (first boot or after a database wipe).

## Frontend Changes

### Things List Table

The Name column gets the ThingType icon prepended:

```
[icon] Device Name    192.168.1.x   AA:BB:CC:...   Vendor    ● Status
```

- Icon uses the type's `color` for the icon color
- Tooltip on hover shows the type name
- Remove the separate "Type" text column — the icon replaces it

### "New Thing" Modal (simplified)

Only essential fields for quick creation:

1. **Name** (required)
2. **Type** (select dropdown showing icon + name, populated from `GET /api/v1/thing-types`)
3. **Network** (select)
4. **MAC Address**
5. **IP Address**

Fields removed from creation modal (available only in detail/edit page):
- Vendor, OS, Description
- Credentials
- Channels

### Thing Detail Page — Conditional Sections

The page fetches the Thing's ThingType (by slug) and uses capabilities to control rendering:

- `enableChannels: true` → render Channels section (add/remove channels)
- `enableChannels: false` → section not rendered
- `enablePortScan: true` → render "Deep Scan" button in the page header
- `enablePortScan: false` → button not rendered
- `enableCredentials: true` → render Credentials section
- `enableCredentials: false` → section not rendered

The edit modal in the detail page keeps all fields (vendor, os, description, etc.) since it has more space.

### Settings Page — ThingType Management

New "Thing Types" section in Settings (between Backup and Users):

- DataTable with columns: Icon (colored), Name, Capabilities (badges: "Channels", "Port Scan", "Credentials"), Actions
- "Add Type" button → modal with: name, slug (auto-generated from name), icon picker, color picker, capability toggles
- Edit button → same modal pre-filled
- Delete button → only for non-system types, confirms if no Things use it
- System types show a small badge/indicator, delete button disabled with tooltip "System type"

### Frontend ThingType Cache

The list of ThingTypes is fetched once and cached in a React context (`ThingTypesProvider`) to avoid repeated API calls. The Things list, detail page, and creation modal all consume from this context.

## Files to Modify/Create

### New files (backend)
- `api/src/thing-types/schemas/thing-type.schema.ts`
- `api/src/thing-types/thing-types.module.ts`
- `api/src/thing-types/thing-types.controller.ts`
- `api/src/thing-types/thing-types.service.ts`
- `api/src/thing-types/thing-types.repository.ts`
- `api/src/thing-types/dto/create-thing-type.dto.ts`
- `api/src/thing-types/dto/update-thing-type.dto.ts`

### New files (frontend)
- `frontend/src/services/thing-types.service.ts`
- `frontend/src/contexts/thing-types-context.tsx`

### Modified files (backend)
- `api/src/things/schemas/thing.schema.ts` — remove ThingType enum, type becomes plain string
- `api/src/things/dto/create-thing.dto.ts` — `@IsEnum(ThingType)` → `@IsString()`
- `api/src/app.module.ts` — register ThingTypesModule
- `api/src/backup/backup.service.ts` — include ThingTypes in export/restore
- `api/src/scanner/scanner.processor.ts` — no change needed (already uses `'other' as any`)

### Modified files (frontend)
- `frontend/src/types/index.ts` — add ThingType interface
- `frontend/src/app/(dashboard)/things/page.tsx` — icon in Name column, remove Type column, simplify modal, use ThingTypes from context
- `frontend/src/app/(dashboard)/things/[id]/page.tsx` — conditional sections based on capabilities
- `frontend/src/app/(dashboard)/settings/page.tsx` — add ThingTypes management section
- `frontend/src/app/layout.tsx` — wrap with ThingTypesProvider

## What NOT to Do

- Do not auto-infer type from scan data — type remains user-set
- Do not implement the actual "Deep Scan" action in this spec — just the button that will call the existing scanner API. The scan logic already exists.
- Do not add type-specific form fields yet (e.g., different create forms per type) — that's a future enhancement
- Do not create a separate page for ThingType management — it lives in Settings
