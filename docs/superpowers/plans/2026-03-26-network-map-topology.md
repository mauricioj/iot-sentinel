# Network Map Topology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the network map from flat linear layout to real star topology per network, with gateway at center, things connected radially, health-colored edges, type icons, and group color indicators.

**Architecture:** Single file rewrite of `frontend/src/app/(dashboard)/map/page.tsx`. Uses existing React Flow (XYFlow), ThingTypes context for icons/colors, and groups data for color indicators. No backend changes. Radial positioning algorithm places gateway at center of each network area.

**Tech Stack:** React Flow (@xyflow/react), existing ThingTypes context, Lucide icons.

---

### Task 1: Rewrite Network Map Page

**Files:**
- Rewrite: `frontend/src/app/(dashboard)/map/page.tsx`

- [ ] **Step 1: Rewrite the map page**

Complete rewrite of `frontend/src/app/(dashboard)/map/page.tsx` with:

**Imports needed:**
- React Flow: ReactFlow, Background, Controls, MiniMap, Handle, Position, Node, Edge, NodeTypes, NodeProps
- Lucide: MapPin, Router (for gateway icon)
- Services: localsService, networksService, thingsService, groupsService
- Context: useThingTypes
- Types: Local, Network, Thing, Group
- Icon utility: getIconComponent from @/components/ui/icon-picker

**Custom Node Types (3):**

1. **GatewayNode** — Larger node for gateway:
   - Router icon (or ThingType icon if it's a real device)
   - Name + IP label
   - Status dot (green/red/gray) if it's a real thing
   - Larger than thing nodes (min-w-[160px])
   - Has source+target handles for React Flow edges

2. **ThingNode** — Device node:
   - ThingType icon (colored, from context via `getIconComponent`)
   - Thing name (primary text)
   - IP address (small, muted)
   - Status dot: green (online), red (offline), gray (unknown/discovered)
   - Left border colored with first group's color (if any groups)
   - Dashed border for discovered things
   - Has target handle for incoming edge from gateway

3. **NetworkContainerNode** — Background label for network area:
   - Just a label showing network name + CIDR
   - Very subtle styling, acts as visual grouping
   - No handles (not connected to anything)

**Data Fetching:**
Same pattern as current but also fetch groups:
```typescript
const localsRes = await localsService.findAll(1, 100);
const groups = (await groupsService.findAll(1, 100)).data;
// + networks per local, things per network (same as current)
```

**buildGraph function — Radial star layout:**

For each Local:
1. Create a LocalNode (top-level label)

For each Network in that Local:
2. Create a NetworkContainerNode (background label)
3. Determine gateway: find a Thing whose `ipAddress === network.gateway`. If found, that thing IS the gateway node. If not, create a virtual gateway node.
4. Place gateway at center of network area
5. Place things in a circle around gateway:
   ```
   radius = Math.max(150, Math.min(300, things.length * 45))
   angle = (index / totalThings) * 2 * Math.PI - Math.PI/2  // start from top
   x = centerX + radius * cos(angle)
   y = centerY + radius * sin(angle)
   ```
6. Create edges from gateway to each thing:
   - If thing is online: `animated: true`, stroke green
   - If thing is offline/unknown: `animated: false`, stroke gray, `strokeDasharray: '5 5'`

**Network area positioning:**
- Each network area gets a center point
- Networks stack vertically with 500px gap per network
- Center X offset by Local (multiple locals side by side, 800px apart)

**Node data shape:**
```typescript
// Gateway node data
{ label: string, ip: string, isRealDevice: boolean, thingId?: string, healthStatus?: string, icon?: string, iconColor?: string }

// Thing node data
{ label: string, ip: string, thingId: string, healthStatus: string, registrationStatus: string, icon: string, iconColor: string, groupColor?: string }
```

**Edge styling:**
```typescript
{
  id: `e-gw-thing-${thingId}`,
  source: gatewayNodeId,
  target: `thing-${thingId}`,
  animated: healthStatus === 'online',
  style: {
    stroke: healthStatus === 'online' ? '#22c55e' : '#6b7280',
    strokeDasharray: healthStatus === 'online' ? undefined : '5 5',
  },
}
```

**MiniMap colors:**
```typescript
nodeColor={(node) => {
  if (node.type === 'gateway') return '#6366f1';
  if (node.type === 'networkContainer') return 'transparent';
  const hs = node.data?.healthStatus;
  if (hs === 'online') return '#22c55e';
  if (hs === 'offline') return '#ef4444';
  return '#9ca3af';
}}
```

**Click handler:**
- Click gateway (if real device) → navigate to `/things/:id`
- Click thing → navigate to `/things/:id`

- [ ] **Step 2: Build and verify**

```bash
cd frontend && npx next build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(dashboard\)/map/page.tsx
git commit -m "feat(map): rewrite as star topology with gateway, radial layout, health colors"
```

---

### Task 2: Final Verification — Docker Build

- [ ] **Step 1: Docker build frontend**

```bash
docker build -t test-frontend -f frontend/Dockerfile frontend/
```

Must pass.

- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "feat: network map topology — complete"
```
