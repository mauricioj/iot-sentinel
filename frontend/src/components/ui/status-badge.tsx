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
