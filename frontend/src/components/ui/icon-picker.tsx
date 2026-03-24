'use client';

import { useState } from 'react';
import {
  Camera, Wifi, Router, Server, Monitor, Printer, Cpu, HardDrive,
  Smartphone, Tv, Radio, Lightbulb, Thermometer, Lock, Eye, Globe,
  Box, Zap, Volume2, Fan, Gauge, PlugZap, CircuitBoard, Cctv,
  Network, Radar, Activity, Database, Cloud, Shield,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  camera: Camera, wifi: Wifi, router: Router, server: Server,
  monitor: Monitor, printer: Printer, cpu: Cpu, 'hard-drive': HardDrive,
  smartphone: Smartphone, tv: Tv, radio: Radio, lightbulb: Lightbulb,
  thermometer: Thermometer, lock: Lock, eye: Eye, globe: Globe,
  box: Box, zap: Zap, volume: Volume2, fan: Fan, gauge: Gauge,
  'plug-zap': PlugZap, 'circuit-board': CircuitBoard, cctv: Cctv,
  network: Network, radar: Radar, activity: Activity, database: Database,
  cloud: Cloud, shield: Shield,
};

export function getIconComponent(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ICONS[name] || Box;
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = getIconComponent(value);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">Icon</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full h-10 rounded border border-border bg-input px-3 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <SelectedIcon className="h-5 w-5" />
        <span>{value || 'Select icon'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-6 gap-1 p-2 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false); }}
              className={cn(
                'flex flex-col items-center gap-1 rounded p-2 text-xs transition-colors',
                value === name
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
