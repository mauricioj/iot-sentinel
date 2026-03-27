'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UptimeBar } from './uptime-bar';
import { statusHistoryService } from '@/services/status-history.service';
import { ThingHistory } from '@/types';

const RANGES = [
  { value: '24h', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function StatusHistoryCard({ thingId }: { thingId: string }) {
  const t = useTranslations('StatusHistory');
  const [range, setRange] = useState('24h');
  const [history, setHistory] = useState<ThingHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statusHistoryService.getHistory(thingId, range);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [thingId, range]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const rangeConfig = RANGES.find((r) => r.value === range) || RANGES[0];
  const rangeStart = new Date(Date.now() - rangeConfig.ms);

  const uptimeColor = history
    ? history.uptime.uptimePercent >= 95 ? 'text-success'
    : history.uptime.uptimePercent >= 80 ? 'text-warning'
    : 'text-destructive'
    : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setRange(r.value)}
              >
                {t(r.value as '24h' | '7d' | '30d')}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : history ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className={`text-2xl font-bold ${uptimeColor}`}>
                {history.uptime.uptimePercent}%
              </span>
              <span className="text-sm text-muted-foreground">
                {t('uptime', { value: rangeConfig.value })}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {t('online')} {formatDuration(history.uptime.totalOnline)} · {t('offline')} {formatDuration(history.uptime.totalOffline)}
              </span>
            </div>

            <UptimeBar events={history.events} rangeMs={rangeConfig.ms} rangeStart={rangeStart} />

            {history.events.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">{t('recentEvents')}</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...history.events].reverse().slice(0, 20).map((event, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <span className={`h-2 w-2 rounded-full ${event.healthStatus === 'online' ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span className="capitalize">{event.healthStatus}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.events.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noEvents')}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
