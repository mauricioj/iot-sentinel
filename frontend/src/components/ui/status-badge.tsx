import { Badge } from './badge';
import { Wifi, WifiOff, HelpCircle, Search } from 'lucide-react';

const healthConfig: Record<string, { variant: 'success' | 'destructive' | 'warning'; icon: typeof Wifi; label: string }> = {
  online: { variant: 'success', icon: Wifi, label: 'Online' },
  offline: { variant: 'destructive', icon: WifiOff, label: 'Offline' },
  unknown: { variant: 'warning', icon: HelpCircle, label: 'Unknown' },
};

export function StatusBadge({ registrationStatus, healthStatus }: {
  registrationStatus: string;
  healthStatus: string;
}) {
  if (registrationStatus === 'discovered') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Search className="h-3 w-3" />
        Discovered
      </Badge>
    );
  }

  const config = healthConfig[healthStatus] || healthConfig.unknown;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
