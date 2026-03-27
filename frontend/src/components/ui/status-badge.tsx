'use client';

import { useTranslations } from 'next-intl';
import { Badge } from './badge';
import { Wifi, WifiOff, HelpCircle, Search } from 'lucide-react';

const healthConfig: Record<string, { variant: 'success' | 'destructive' | 'warning'; icon: typeof Wifi; key: string }> = {
  online: { variant: 'success', icon: Wifi, key: 'online' },
  offline: { variant: 'destructive', icon: WifiOff, key: 'offline' },
  unknown: { variant: 'warning', icon: HelpCircle, key: 'unknown' },
};

export function StatusBadge({ registrationStatus, healthStatus }: {
  registrationStatus: string;
  healthStatus: string;
}) {
  const t = useTranslations('Status');

  if (registrationStatus === 'discovered') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Search className="h-3 w-3" />
        {t('discovered')}
      </Badge>
    );
  }

  const config = healthConfig[healthStatus] || healthConfig.unknown;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {t(config.key as 'online' | 'offline' | 'unknown')}
    </Badge>
  );
}
