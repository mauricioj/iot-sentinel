import { api } from './api';
import { ThingHistory, UptimeStats } from '@/types';

export const statusHistoryService = {
  getHistory: (thingId: string, range: string = '24h') =>
    api<ThingHistory>(`/api/v1/things/${thingId}/history?range=${range}`),
  getAverageUptime: (range: string = '24h') =>
    api<UptimeStats>(`/api/v1/dashboard/uptime?range=${range}`),
};
