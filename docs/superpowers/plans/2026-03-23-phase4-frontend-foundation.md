# Phase 4: Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js frontend with dark theme (Grafana-style), app shell (sidebar + header with notification bell), authentication flow (login, token management, route protection), setup wizard, and Docker integration — producing a working UI that connects to the existing API.

**Architecture:** Next.js 14 App Router with TypeScript. Tailwind CSS for styling with a custom dark theme. Client-side auth using JWT tokens stored in memory (access) and localStorage (refresh). An AuthProvider context wraps the app. A middleware checks setup status and redirects to `/setup` if not completed. API calls go through a centralized service layer using fetch with automatic token refresh.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React (icons), next-themes (dark mode)

**Spec:** `docs/superpowers/specs/2026-03-23-iot-sentinel-design.md`

---

## File Structure

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.json
├── .dockerignore
├── Dockerfile
├── Dockerfile.dev
├── src/
│   ├── app/
│   │   ├── layout.tsx                ← Root layout (providers, fonts)
│   │   ├── globals.css               ← Tailwind imports + dark theme vars
│   │   ├── login/
│   │   │   └── page.tsx              ← Login page
│   │   ├── setup/
│   │   │   └── page.tsx              ← Setup wizard
│   │   └── (dashboard)/
│   │       ├── layout.tsx            ← Authenticated layout (sidebar + header)
│   │       └── page.tsx              ← Dashboard (placeholder for Phase 5)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   └── select.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── sidebar-item.tsx
│   │   └── auth/
│   │       └── auth-guard.tsx
│   ├── contexts/
│   │   └── auth-context.tsx
│   ├── services/
│   │   ├── api.ts                    ← Base fetch wrapper with token refresh
│   │   └── auth.service.ts           ← Login, refresh, logout
│   ├── types/
│   │   └── index.ts                  ← Shared TypeScript interfaces
│   └── utils/
│       └── cn.ts                     ← className merge utility
```

---

### Task 1: Next.js Project Bootstrap

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/.eslintrc.json`
- Create: `frontend/.dockerignore`
- Create: `frontend/Dockerfile`
- Create: `frontend/Dockerfile.dev`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

This generates all config files. If it prompts, answer: TypeScript=Yes, ESLint=Yes, Tailwind=Yes, src/=Yes, App Router=Yes, import alias=No.

- [ ] **Step 2: Install additional dependencies**

```bash
cd frontend
npm install lucide-react clsx tailwind-merge
```

- [ ] **Step 3: Create .dockerignore**

```
node_modules
.next
coverage
.env
*.log
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 5: Create Dockerfile.dev**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 6: Update next.config.js for standalone output**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

- [ ] **Step 7: Remove .gitkeep from frontend/**

```bash
rm frontend/.gitkeep 2>/dev/null
```

- [ ] **Step 8: Verify it runs**

```bash
cd frontend && npm run build && npm run dev
```
Visit http://localhost:3000 — should show default Next.js page.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): bootstrap Next.js 14 with TypeScript, Tailwind, Docker"
```

---

### Task 2: Dark Theme and Global Styles

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/src/utils/cn.ts`

- [ ] **Step 1: Update tailwind.config.ts for dark theme**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Update globals.css with dark theme variables**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0f;
  --foreground: #e4e4e7;
  --card: #131318;
  --card-foreground: #e4e4e7;
  --border: #27272a;
  --input: #1e1e24;
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --secondary: #1e1e2e;
  --secondary-foreground: #a1a1aa;
  --muted: #18181b;
  --muted-foreground: #71717a;
  --accent: #1e1e2e;
  --accent-foreground: #e4e4e7;
  --destructive: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --sidebar: #0d0d12;
  --sidebar-foreground: #a1a1aa;
  --radius: 0.5rem;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--background);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}
```

- [ ] **Step 3: Create cn.ts utility**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add dark theme with CSS variables and Grafana-style palette"
```

---

### Task 3: Base UI Components

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/select.tsx`

- [ ] **Step 1: Create button.tsx**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'bg-destructive text-white hover:bg-destructive/90': variant === 'destructive',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
```

- [ ] **Step 2: Create input.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
```

- [ ] **Step 3: Create card.tsx**

```tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-6 text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('', className)} {...props} />;
}
```

- [ ] **Step 4: Create badge.tsx**

```tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'secondary';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-primary/20 text-primary': variant === 'default',
          'bg-success/20 text-success': variant === 'success',
          'bg-destructive/20 text-destructive': variant === 'destructive',
          'bg-warning/20 text-warning': variant === 'warning',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
        },
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Create select.tsx**

```tsx
import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat(frontend): add base UI components (Button, Input, Card, Badge, Select)"
```

---

### Task 4: TypeScript Types and API Service Layer

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/auth.service.ts`

- [ ] **Step 1: Create types/index.ts**

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface User {
  _id: string;
  username: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SetupStatus {
  setupCompleted: boolean;
}

export interface Settings {
  _id: string;
  instanceName: string;
  language: string;
  timezone: string;
  setupCompleted: boolean;
}

export interface Local {
  _id: string;
  name: string;
  description: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Network {
  _id: string;
  localId: string;
  name: string;
  vlanId: number | null;
  cidr: string;
  gateway: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Thing {
  _id: string;
  networkId: string;
  groupIds: string[];
  name: string;
  type: string;
  macAddress: string;
  ipAddress: string;
  hostname: string;
  status: 'online' | 'offline' | 'unknown' | 'discovered';
  lastSeenAt: string;
  ports: { port: number; protocol: string; service: string; version: string }[];
  channels: { number: number; direction: string; name: string; type: string; description: string }[];
  credentials: { username: string; password: string; notes: string };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  things: {
    total: number;
    online: number;
    offline: number;
    unknown: number;
    discovered: number;
  };
  locals: {
    total: number;
  };
}
```

- [ ] **Step 2: Create services/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('refreshToken');
      return null;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // If 401, try refreshing token
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 3: Create services/auth.service.ts**

```typescript
import { api, setAccessToken } from './api';
import { TokenResponse, SetupStatus, Settings } from '@/types';

export const authService = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const data = await api<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
    }
  },

  async getSetupStatus(): Promise<SetupStatus> {
    return api<SetupStatus>('/api/v1/setup/status');
  },

  async completeSetup(data: {
    language: string;
    instanceName: string;
    timezone: string;
    adminUsername: string;
    adminPassword: string;
  }): Promise<Settings> {
    return api<Settings>('/api/v1/setup/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/ frontend/src/services/
git commit -m "feat(frontend): add TypeScript types and API service layer with token refresh"
```

---

### Task 5: Auth Context and Auth Guard

**Files:**
- Create: `frontend/src/contexts/auth-context.tsx`
- Create: `frontend/src/components/auth/auth-guard.tsx`

- [ ] **Step 1: Create auth-context.tsx**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { setAccessToken, getAccessToken } from '@/services/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tryRestoreSession = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Decode JWT to get user info
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        setUser({ _id: payload.sub, username: payload.username, role: payload.role, createdAt: '' });
      } else {
        localStorage.removeItem('refreshToken');
      }
    } catch {
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    tryRestoreSession();
  }, [tryRestoreSession]);

  const login = async (username: string, password: string) => {
    const data = await authService.login(username, password);
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    setUser({ _id: payload.sub, username: payload.username, role: payload.role, createdAt: '' });
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Create auth-guard.tsx**

```tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/ frontend/src/components/auth/
git commit -m "feat(frontend): add auth context with JWT management and route guard"
```

---

### Task 6: App Shell — Sidebar and Header

**Files:**
- Create: `frontend/src/components/layout/sidebar-item.tsx`
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Create sidebar-item.tsx**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function SidebarItem({ href, icon: Icon, label }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Create sidebar.tsx**

```tsx
'use client';

import {
  LayoutDashboard,
  MapPin,
  Network,
  Box,
  FolderOpen,
  Radar,
  Settings,
} from 'lucide-react';
import { SidebarItem } from './sidebar-item';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/locals', icon: MapPin, label: 'Locals' },
  { href: '/things', icon: Box, label: 'Things' },
  { href: '/groups', icon: FolderOpen, label: 'Groups' },
  { href: '/map', icon: Network, label: 'Network Map' },
  { href: '/scanner', icon: Radar, label: 'Scanner' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Radar className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">IoT Sentinel</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create header.tsx**

```tsx
'use client';

import { Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
      <div />
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            0
          </span>
        </button>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{user?.username}</span>
          <Badge variant="secondary">{user?.role}</Badge>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat(frontend): add app shell with sidebar navigation and header"
```

---

### Task 7: Root Layout and Login Page

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Update root layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';

export const metadata: Metadata = {
  title: 'IoT Sentinel',
  description: 'IoT device management and network monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create login/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Radar } from 'lucide-react';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if setup is completed
    authService.getSetupStatus().then((status) => {
      if (!status.setupCompleted) {
        router.push('/setup');
      } else if (isAuthenticated) {
        router.push('/');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Radar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">IoT Sentinel</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!username || !password}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/
git commit -m "feat(frontend): add root layout with auth provider and login page"
```

---

### Task 8: Setup Wizard Page

**Files:**
- Create: `frontend/src/app/setup/page.tsx`

- [ ] **Step 1: Create setup/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Radar, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const LANGUAGES = [
  { value: 'pt-BR', label: 'Portugues (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
];

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'UTC', label: 'UTC' },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('pt-BR');
  const [instanceName, setInstanceName] = useState('IoT Sentinel');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const totalSteps = 3;

  const handleComplete = async () => {
    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.completeSetup({
        language,
        instanceName,
        timezone,
        adminUsername,
        adminPassword,
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Radar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Welcome to IoT Sentinel</h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of {totalSteps} — Initial setup
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-12 rounded-full ${i < step ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Select
              id="language"
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={LANGUAGES}
            />
            <Input
              id="instanceName"
              label="Instance Name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="IoT Sentinel"
            />
            <Select
              id="timezone"
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={TIMEZONES}
            />
            <Button className="w-full" onClick={() => setStep(2)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input
              id="adminUsername"
              label="Admin Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder="admin"
            />
            <Input
              id="adminPassword"
              label="Password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(3)}
                disabled={!adminUsername || adminPassword.length < 6 || adminPassword !== confirmPassword}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Language</span>
                <span>{LANGUAGES.find((l) => l.value === language)?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Instance</span>
                <span>{instanceName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Timezone</span>
                <span>{timezone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Admin user</span>
                <span>{adminUsername}</span>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                {loading ? 'Setting up...' : <><Check className="mr-2 h-4 w-4" /> Complete</>}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/setup/
git commit -m "feat(frontend): add setup wizard with 3-step flow"
```

---

### Task 9: Authenticated Dashboard Layout (Placeholder)

**Files:**
- Create: `frontend/src/app/(dashboard)/layout.tsx`
- Create: `frontend/src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create authenticated layout**

```tsx
'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-60">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Create dashboard placeholder page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { DashboardStats } from '@/types';
import { Box, Wifi, WifiOff, HelpCircle, Search } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/api/v1/dashboard/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const cards = [
    { title: 'Total Things', value: stats?.things.total ?? 0, icon: Box, color: 'text-primary' },
    { title: 'Online', value: stats?.things.online ?? 0, icon: Wifi, color: 'text-success' },
    { title: 'Offline', value: stats?.things.offline ?? 0, icon: WifiOff, color: 'text-destructive' },
    { title: 'Unknown', value: stats?.things.unknown ?? 0, icon: HelpCircle, color: 'text-warning' },
    { title: 'Discovered', value: stats?.things.discovered ?? 0, icon: Search, color: 'text-muted-foreground' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(dashboard\)/
git commit -m "feat(frontend): add authenticated dashboard layout with stats cards"
```

---

### Task 10: Docker Compose Frontend + Verification

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.dev.yml`

- [ ] **Step 1: Add frontend service to docker-compose.yml**

Add before the api service:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: iot-sentinel-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:4000
    depends_on:
      - api
```

- [ ] **Step 2: Add frontend dev overrides to docker-compose.dev.yml**

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
```

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Verify frontend runs locally**

Start the API first (needs MongoDB + Redis running), then:
```bash
cd frontend && npm run dev
```
Visit http://localhost:3000 — should redirect to /setup or /login.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat(docker): add frontend service to Docker Compose"
```

---

## Phase Summary

After completing this plan, you will have:
- **Next.js 14** app with App Router and TypeScript
- **Dark theme** (Grafana/Datadog style) with CSS variables
- **Base UI components**: Button, Input, Card, Badge, Select
- **API service layer** with fetch wrapper, automatic token refresh
- **Auth context** with JWT management, session restore
- **Auth guard** for protected routes
- **App shell**: sidebar with icon navigation, header with user info and notification bell
- **Login page**: dark, minimal, connects to API
- **Setup wizard**: 3-step flow (language/instance → admin credentials → review)
- **Dashboard page**: stat cards (total, online, offline, unknown, discovered)
- **Docker Compose** with frontend service
- Everything wired: login → dashboard, setup → login

## Next Phase

**Phase 5: Frontend CRUD** — Locals, Networks, Things, Groups pages, scanner page, and network map.
