'use client';

import {
  LayoutDashboard,
  MapPin,
  Network,
  Box,
  FolderOpen,
  Radar,
  Settings,
  Bell,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SidebarItem } from './sidebar-item';

export function Sidebar() {
  const t = useTranslations('Sidebar');

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/locals', icon: MapPin, label: t('locals') },
    { href: '/things', icon: Box, label: t('things') },
    { href: '/groups', icon: FolderOpen, label: t('groups') },
    { href: '/map', icon: Network, label: t('networkMap') },
    { href: '/scanner', icon: Radar, label: t('scanner') },
    { href: '/notifications', icon: Bell, label: t('notifications') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Radar className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{t('title')}</span>
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
