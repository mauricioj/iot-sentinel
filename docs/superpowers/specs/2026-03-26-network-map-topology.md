# Network Map — Real Topology Visualization

## Context

The current network map shows a flat linear hierarchy (Local → Network → Things) without connections, grouping, or visual topology. Things appear as disconnected boxes. Users want a real network topology view where devices are connected to their gateway in a star layout, with visual indicators for health status, device type, and group membership.

## Layout

Each **Network** is rendered as a container/subflow area with a **star topology**:

- **Gateway node** at the center of each network area
  - If a Thing exists with IP matching `network.gateway`, that Thing is the gateway node (shows its real name, type icon, status)
  - If no Thing matches the gateway IP, a virtual "Gateway" node is rendered with the gateway IP as label and a router icon
- **Thing nodes** positioned radially around the gateway
  - Connected to the gateway with edges (lines)
  - Positioned using a circular algorithm (360° / nThings)

### Multi-network view

Networks are arranged in a grid or vertical stack, each as a distinct area:

```
┌─ Local: Office ─────────────────────────────────┐
│                                                   │
│  ┌─ VLAN 10 (192.168.1.0/24) ─────────────────┐ │
│  │        [Camera]──┐                           │ │
│  │                   │                          │ │
│  │    [Printer]────[GW]────[Server]             │ │
│  │                   │                          │ │
│  │        [NAS]─────┘                           │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ VLAN 20 (192.168.2.0/24) ─────────────────┐ │
│  │    [PLC]────[GW]────[HMI]                   │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

## Node Design

### Thing Node
- **Icon**: ThingType icon (from thing-types context), colored with ThingType color
- **Name**: Thing name (primary text)
- **IP**: Below name, small muted text
- **Status dot**: Small circle — green (online), red (offline), gray (unknown)
- **Group indicator**: If thing belongs to a group, thin left border or subtle background tint with the group's color. If multiple groups, use the first group's color.
- **Discovered badge**: Muted/dashed border for discovered (unregistered) things

### Gateway Node
- **Icon**: Router icon (or the Thing's type icon if it's a real device)
- **Label**: "Gateway" + IP, or Thing name if it's a real device
- **Larger size** than regular Thing nodes to emphasize centrality
- **Status**: Same health colors as regular nodes

### Network Container
- **Label**: Network name + CIDR (e.g., "VLAN 10 — 192.168.1.0/24")
- **Border**: Subtle rounded border, slightly darker background
- **Uses React Flow's grouping** (parent node) or a background rectangle

### Local Container
- **Label**: Local name
- **Outer border**: Primary color accent
- **Contains**: All networks belonging to that local

## Edges

- **Gateway → Thing**: Solid line when thing is online, dashed when offline/unknown
- **Animated**: Subtle animated flow dot on edges of online things (React Flow's animated edge)
- **Color**: Green for online connections, gray for offline/unknown

## Positioning Algorithm

Radial layout per network:

1. Each network area has a center point
2. Gateway placed at center
3. Things distributed in a circle around gateway:
   - `angle = (index / totalThings) * 2 * Math.PI`
   - `x = centerX + radius * cos(angle)`
   - `y = centerY + radius * sin(angle)`
   - `radius = Math.max(150, Math.min(300, totalThings * 40))`
4. Network areas stacked vertically per Local with padding
5. Multiple Locals side by side if screen width allows

## Interaction

- **Click node** → Navigate to Thing detail page (`/things/:id`)
- **Zoom/Pan** — Built-in React Flow controls
- **Minimap** — React Flow MiniMap component in bottom-right corner
- **Filter by Local** — Dropdown at top to filter which Local to show (useful when many locals exist)
- **Hover node** — Show tooltip with full details (name, IP, MAC, vendor, type, groups)

## Data Requirements

All data already exists in the API — no backend changes needed:

- `GET /api/v1/locals` → All locals
- `GET /api/v1/locals/:id/networks` → Networks per local
- `GET /api/v1/things?networkId=X` → Things per network
- `GET /api/v1/groups` → All groups (for color mapping)
- `GET /api/v1/thing-types` → All thing types (from context, already cached)

The map page fetches all data on mount and builds the graph client-side.

## Files to Modify

- Rewrite: `frontend/src/app/(dashboard)/map/page.tsx` — Complete rewrite of the map page with new topology layout
- No backend changes
- No new dependencies (React Flow / XYFlow already installed)

## What NOT to Do

- Do not add manual position persistence — positions are auto-calculated
- Do not add device-to-device connections (e.g., camera→NVR) — only gateway→thing for v1
- Do not add drag-to-reposition with save — pure auto-layout
- Do not create custom React Flow node types in separate files — keep node renderers inline in the map page (the page is self-contained)
