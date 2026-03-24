# Phase 5: Frontend CRUD Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all CRUD pages for the IoT Sentinel frontend — Locals (list + detail), Things (list with filters + detail with credentials), Groups (list + detail), Scanner (trigger + job history), Settings page, and a Network Map visualization.

**Architecture:** Each domain gets a service file for API calls and page components under the `(dashboard)` route group (already protected by AuthGuard). Reusable patterns: data tables with pagination, create/edit modals, delete confirmation. The network map uses React Flow for topology visualization. All pages use the existing dark theme, UI components, and `api()` fetch wrapper.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4, Lucide React, React Flow (network map), existing services/api.ts

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

**IMPORTANT — AGENTS.md warning:** This project uses a newer Next.js version. Check `node_modules/next/dist/docs/` if you encounter unexpected API differences. All page components are `'use client'`.

---

## File Structure

```
frontend/src/
├── services/
│   ├── locals.service.ts
│   ├── networks.service.ts
│   ├── things.service.ts
│   ├── groups.service.ts
│   └── scanner.service.ts
├── components/
│   ├── ui/
│   │   ├── modal.tsx
│   │   ├── data-table.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── status-badge.tsx
│   │   └── empty-state.tsx
│   └── things/
│       └── credentials-reveal.tsx
├── hooks/
│   └── use-pagination.ts
└── app/(dashboard)/
    ├── locals/
    │   ├── page.tsx              ← Locals list + create modal
    │   └── [id]/
    │       └── page.tsx          ← Local detail (networks, things count)
    ├── things/
    │   ├── page.tsx              ← Things list with filters + search
    │   └── [id]/
    │       └── page.tsx          ← Thing detail (channels, credentials, ports)
    ├── groups/
    │   ├── page.tsx              ← Groups list
    │   └── [id]/
    │       └── page.tsx          ← Group detail (things in group)
    ├── scanner/
    │   └── page.tsx              ← Scanner trigger + job history
    ├── map/
    │   └── page.tsx              ← Network topology map
    └── settings/
        └── page.tsx              ← Settings page
```

---

### Task 1: Shared UI Components (Modal, DataTable, StatusBadge, EmptyState)

**Files:**
- Create: `frontend/src/components/ui/modal.tsx`
- Create: `frontend/src/components/ui/data-table.tsx`
- Create: `frontend/src/components/ui/confirm-dialog.tsx`
- Create: `frontend/src/components/ui/status-badge.tsx`
- Create: `frontend/src/components/ui/empty-state.tsx`
- Create: `frontend/src/hooks/use-pagination.ts`

- [ ] **Step 1: Create modal.tsx**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={cn('w-full max-w-lg rounded-lg border border-border bg-card p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create data-table.tsx**

```tsx
'use client';

import { cn } from '@/utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

export function DataTable<T extends { _id: string }>({ columns, data, onRowClick, loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 text-left font-medium text-muted-foreground', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item._id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b border-border last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/30',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3', col.className)}>
                  {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create confirm-dialog.tsx**

```tsx
'use client';

import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create status-badge.tsx**

```tsx
import { Badge } from './badge';
import { Wifi, WifiOff, HelpCircle, Search } from 'lucide-react';

const statusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning' | 'secondary'; icon: typeof Wifi; label: string }> = {
  online: { variant: 'success', icon: Wifi, label: 'Online' },
  offline: { variant: 'destructive', icon: WifiOff, label: 'Offline' },
  unknown: { variant: 'warning', icon: HelpCircle, label: 'Unknown' },
  discovered: { variant: 'secondary', icon: Search, label: 'Discovered' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 5: Create empty-state.tsx**

```tsx
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 6: Create use-pagination.ts hook**

```typescript
'use client';

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrev = page > 1;

  const next = useCallback(() => { if (hasNext) setPage((p) => p + 1); }, [hasNext]);
  const prev = useCallback(() => { if (hasPrev) setPage((p) => p - 1); }, [hasPrev]);
  const reset = useCallback(() => setPage(1), []);

  return { page, limit, total, pages, hasNext, hasPrev, next, prev, reset, setTotal, setPage };
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/ frontend/src/hooks/
git commit -m "feat(frontend): add shared UI components (Modal, DataTable, StatusBadge, EmptyState)"
```

---

### Task 2: API Service Files

**Files:**
- Create: `frontend/src/services/locals.service.ts`
- Create: `frontend/src/services/networks.service.ts`
- Create: `frontend/src/services/things.service.ts`
- Create: `frontend/src/services/groups.service.ts`
- Create: `frontend/src/services/scanner.service.ts`

- [ ] **Step 1: Create locals.service.ts**

```typescript
import { api } from './api';
import { Local, PaginatedResponse } from '@/types';

export const localsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Local>>(`/api/v1/locals?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Local>(`/api/v1/locals/${id}`),
  create: (data: Partial<Local>) =>
    api<Local>('/api/v1/locals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Local>) =>
    api<Local>(`/api/v1/locals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/locals/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Create networks.service.ts**

```typescript
import { api } from './api';
import { Network, PaginatedResponse } from '@/types';

export const networksService = {
  findByLocal: (localId: string, page = 1, limit = 20) =>
    api<PaginatedResponse<Network>>(`/api/v1/locals/${localId}/networks?page=${page}&limit=${limit}`),
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Network>>(`/api/v1/networks?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Network>(`/api/v1/networks/${id}`),
  create: (localId: string, data: Partial<Network>) =>
    api<Network>(`/api/v1/locals/${localId}/networks`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Network>) =>
    api<Network>(`/api/v1/networks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/networks/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 3: Create things.service.ts**

```typescript
import { api } from './api';
import { Thing, PaginatedResponse } from '@/types';

export const thingsService = {
  findAll: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ page: '1', limit: '20', ...params }).toString();
    return api<PaginatedResponse<Thing>>(`/api/v1/things?${query}`);
  },
  findById: (id: string) => api<Thing>(`/api/v1/things/${id}`),
  create: (data: Partial<Thing>) =>
    api<Thing>('/api/v1/things', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Thing>) =>
    api<Thing>(`/api/v1/things/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/things/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 4: Create groups.service.ts**

```typescript
import { api } from './api';
import { Group, Thing, PaginatedResponse } from '@/types';

export const groupsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Group>>(`/api/v1/groups?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Group>(`/api/v1/groups/${id}`),
  create: (data: Partial<Group>) =>
    api<Group>('/api/v1/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Group>) =>
    api<Group>(`/api/v1/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/groups/${id}`, { method: 'DELETE' }),
  getThings: (id: string, page = 1, limit = 20) =>
    api<PaginatedResponse<Thing>>(`/api/v1/groups/${id}/things?page=${page}&limit=${limit}`),
};
```

- [ ] **Step 5: Create scanner.service.ts**

```typescript
import { api } from './api';
import { PaginatedResponse } from '@/types';

export interface ScanJob {
  _id: string;
  networkId: string;
  type: 'discovery' | 'status_check' | 'deep_scan';
  status: 'queued' | 'running' | 'completed' | 'failed';
  triggeredBy: 'manual' | 'scheduled';
  startedAt: string;
  completedAt: string;
  results: { macAddress: string; ipAddress: string; hostname: string; isNew: boolean }[];
  createdAt: string;
}

export const scannerService = {
  discover: (networkId: string, type = 'discovery') =>
    api<ScanJob>('/api/v1/scanner/discover', { method: 'POST', body: JSON.stringify({ networkId, type }) }),
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<ScanJob>>(`/api/v1/scanner/jobs?page=${page}&limit=${limit}`),
  findById: (id: string) => api<ScanJob>(`/api/v1/scanner/jobs/${id}`),
};
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/
git commit -m "feat(frontend): add API service files for all CRUD domains"
```

---

### Task 3: Locals Pages (List + Detail)

**Files:**
- Create: `frontend/src/app/(dashboard)/locals/page.tsx`
- Create: `frontend/src/app/(dashboard)/locals/[id]/page.tsx`

- [ ] **Step 1: Create locals list page**

Page features: DataTable with name/description/address columns, "New Local" button that opens Modal with form, pagination, click row to navigate to detail. Delete button per row with ConfirmDialog.

- [ ] **Step 2: Create locals detail page**

Page features: Local info card, list of networks in this local (with create network modal), things count per network.

- [ ] **Step 3: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/locals/
git commit -m "feat(frontend): add locals list and detail pages with CRUD"
```

---

### Task 4: Things Pages (List with Filters + Detail)

**Files:**
- Create: `frontend/src/components/things/credentials-reveal.tsx`
- Create: `frontend/src/app/(dashboard)/things/page.tsx`
- Create: `frontend/src/app/(dashboard)/things/[id]/page.tsx`

- [ ] **Step 1: Create credentials-reveal.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CredentialsRevealProps {
  credentials: { username: string; password: string; notes: string };
}

export function CredentialsReveal({ credentials }: CredentialsRevealProps) {
  const [revealed, setRevealed] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Credentials</h3>
        <Button size="sm" variant="ghost" onClick={() => setRevealed(!revealed)}>
          {revealed ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {revealed ? 'Hide' : 'Reveal'}
        </Button>
      </div>
      {revealed ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Username:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.username || '-'}</span>
              {credentials.username && (
                <button onClick={() => copyToClipboard(credentials.username)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Password:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">{credentials.password || '-'}</span>
              {credentials.password && (
                <button onClick={() => copyToClipboard(credentials.password)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {credentials.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1">{credentials.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Click reveal to show credentials</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create things list page**

Page features: DataTable with name/type/IP/MAC/status columns, StatusBadge for status, filter bar (network select, group select, status select, search input), pagination, click row to detail. Create thing button.

- [ ] **Step 3: Create things detail page**

Page features: Thing info card (name, type, MAC, IP, status), Channels section (table of channels if any), Ports section (table of open ports), CredentialsReveal component, Metadata section (JSON display), Edit/Delete buttons.

- [ ] **Step 4: Verify build, commit**

```bash
git add frontend/src/components/things/ frontend/src/app/\(dashboard\)/things/
git commit -m "feat(frontend): add things list with filters and detail page with credential reveal"
```

---

### Task 5: Groups Pages (List + Detail)

**Files:**
- Create: `frontend/src/app/(dashboard)/groups/page.tsx`
- Create: `frontend/src/app/(dashboard)/groups/[id]/page.tsx`

- [ ] **Step 1: Create groups list page**

Page features: Grid of cards (not table) showing group name, icon, color badge, thing count. Create group modal. Click card to detail.

- [ ] **Step 2: Create groups detail page**

Page features: Group info (name, icon, color), DataTable of things in this group (using groupsService.getThings), edit/delete group.

- [ ] **Step 3: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/groups/
git commit -m "feat(frontend): add groups list (card grid) and detail page"
```

---

### Task 6: Scanner Page

**Files:**
- Create: `frontend/src/app/(dashboard)/scanner/page.tsx`

- [ ] **Step 1: Create scanner page**

Page features:
- "New Scan" section at top: network selector dropdown (from networksService.findAll), scan type radio (discovery/status_check/deep_scan), "Start Scan" button
- Job History section: DataTable with type/network/status/triggered by/date columns, status badges (queued=secondary, running=warning, completed=success, failed=destructive), click to expand results
- Auto-refresh running jobs (poll every 5s when there are queued/running jobs)

- [ ] **Step 2: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/scanner/
git commit -m "feat(frontend): add scanner page with scan trigger and job history"
```

---

### Task 7: Settings Page

**Files:**
- Create: `frontend/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Page features:
- Instance section: instance name, language, timezone (editable form)
- Scanner section: max concurrent scans, cooldown seconds
- Monitor section: status check interval
- Save button (calls PATCH /api/v1/settings)
- Users section: list of users with role badges, create user modal (admin only)

- [ ] **Step 2: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/settings/
git commit -m "feat(frontend): add settings page with instance, scanner, and user management"
```

---

### Task 8: Network Map Page (React Flow)

**Files:**
- Create: `frontend/src/app/(dashboard)/map/page.tsx`

- [ ] **Step 1: Install React Flow**

```bash
cd frontend && npm install @xyflow/react
```

- [ ] **Step 2: Create network map page**

Page features:
- Loads all locals, their networks, and things
- Renders a hierarchical graph: Local nodes → Network nodes → Thing nodes
- Thing nodes show icon (based on group), status color (green border = online, red = offline, gray = unknown)
- Click on a thing node to navigate to its detail page
- Background grid, zoom/pan controls, minimap
- Nodes are auto-layouted (top-to-bottom hierarchy)

- [ ] **Step 3: Verify build, commit**

```bash
git add frontend/src/app/\(dashboard\)/map/
git commit -m "feat(frontend): add network map page with React Flow topology visualization"
```

---

### Task 9: Build Verification and Polish

- [ ] **Step 1: Run full frontend build**

```bash
cd frontend && npm run build
```

- [ ] **Step 2: Verify all pages render (manual check or screenshots)**

Navigate through: /login → /setup → / (dashboard) → /locals → /things → /groups → /scanner → /map → /settings

- [ ] **Step 3: Fix any build errors or missing imports**

- [ ] **Step 4: Commit any fixes**

```bash
git add frontend/ && git commit -m "chore(frontend): fix build issues and polish"
```

---

## Phase Summary

After completing this plan, you will have:
- **Shared components**: Modal, DataTable, ConfirmDialog, StatusBadge, EmptyState, usePagination hook
- **Locals pages**: list with create modal + detail with networks
- **Things pages**: list with filters (network, group, status, search) + detail with credential reveal, channels, ports
- **Groups pages**: card grid list + detail with group things
- **Scanner page**: trigger scans + job history with auto-refresh
- **Settings page**: instance config, scanner/monitor settings, user management
- **Network Map**: React Flow topology (Local → Network → Thing) with status colors
- **All API service files** for every domain

## Next Phase

**Phase 6: Notifications & Backup** — Notification rules, WebSocket gateway, in-app notifications, backup/restore.
