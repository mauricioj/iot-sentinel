'use client';

import { useMemo } from 'react';
import { StatusEvent } from '@/types';

interface UptimeBarProps {
  events: StatusEvent[];
  rangeMs: number;
  rangeStart: Date;
}

export function UptimeBar({ events, rangeMs, rangeStart }: UptimeBarProps) {
  const segments = useMemo(() => {
    if (rangeMs <= 0) return [];
    const now = new Date();
    const start = rangeStart.getTime();
    const result: { status: string; startPct: number; widthPct: number }[] = [];

    let currentStatus = events.length > 0 ? 'unknown' : 'unknown';
    let cursor = start;

    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      if (eventTime > cursor) {
        const startPct = ((cursor - start) / rangeMs) * 100;
        const widthPct = ((eventTime - cursor) / rangeMs) * 100;
        result.push({ status: currentStatus, startPct, widthPct });
      }
      currentStatus = event.healthStatus;
      cursor = eventTime;
    }

    // Remaining time to now
    const endTime = Math.min(now.getTime(), start + rangeMs);
    if (cursor < endTime) {
      const startPct = ((cursor - start) / rangeMs) * 100;
      const widthPct = ((endTime - cursor) / rangeMs) * 100;
      result.push({ status: currentStatus, startPct, widthPct });
    }

    return result;
  }, [events, rangeMs, rangeStart]);

  const colorMap: Record<string, string> = {
    online: 'bg-success',
    offline: 'bg-destructive',
    unknown: 'bg-muted',
  };

  return (
    <div className="relative h-6 w-full rounded bg-muted overflow-hidden">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`absolute top-0 h-full ${colorMap[seg.status] || colorMap.unknown}`}
          style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
          title={`${seg.status} (${Math.round(seg.widthPct)}%)`}
        />
      ))}
    </div>
  );
}
