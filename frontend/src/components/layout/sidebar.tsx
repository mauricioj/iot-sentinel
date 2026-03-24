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
