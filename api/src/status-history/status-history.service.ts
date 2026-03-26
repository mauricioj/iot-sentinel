import { Injectable, Logger } from '@nestjs/common';
import { StatusHistoryRepository } from './status-history.repository';

@Injectable()
export class StatusHistoryService {
  private readonly logger = new Logger(StatusHistoryService.name);

  constructor(private readonly repository: StatusHistoryRepository) {}

  async recordTransition(thingId: string, healthStatus: string): Promise<void> {
    await this.repository.create(thingId, healthStatus);
  }

  async getHistory(thingId: string, range: string) {
    const since = this.parseRange(range);
    const events = await this.repository.findByThingId(thingId, since);
    const uptime = await this.calculateUptime(thingId, since, events);
    return { events, uptime };
  }

  async getAverageUptime(range: string) {
    const since = this.parseRange(range);
    const thingIds = await this.repository.findDistinctThingIds(since);
    if (thingIds.length === 0) return { averageUptimePercent: 0, thingCount: 0 };

    let totalUptime = 0;
    for (const thingId of thingIds) {
      const events = await this.repository.findByThingId(thingId, since);
      const { uptimePercent } = await this.calculateUptime(thingId, since, events);
      totalUptime += uptimePercent;
    }

    return {
      averageUptimePercent: Math.round((totalUptime / thingIds.length) * 10) / 10,
      thingCount: thingIds.length,
    };
  }

  private async calculateUptime(thingId: string, since: Date, events: any[]) {
    const now = new Date();
    const totalMs = now.getTime() - since.getTime();
    if (totalMs <= 0) return { uptimePercent: 0, totalOnline: 0, totalOffline: 0 };

    // Determine initial status from last event before the range
    const lastBefore = await this.repository.findLastBefore(thingId, since);
    let currentStatus = lastBefore?.healthStatus || 'unknown';
    let cursor = since.getTime();

    let onlineMs = 0;
    let offlineMs = 0;

    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      const duration = eventTime - cursor;
      if (currentStatus === 'online') onlineMs += duration;
      else offlineMs += duration;
      currentStatus = event.healthStatus;
      cursor = eventTime;
    }

    // Time from last event to now
    const remaining = now.getTime() - cursor;
    if (currentStatus === 'online') onlineMs += remaining;
    else offlineMs += remaining;

    const uptimePercent = Math.round((onlineMs / totalMs) * 1000) / 10;
    return {
      uptimePercent,
      totalOnline: Math.round(onlineMs / 1000),
      totalOffline: Math.round(offlineMs / 1000),
    };
  }

  private parseRange(range: string): Date {
    const now = new Date();
    switch (range) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '24h':
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
