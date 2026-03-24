import { api } from './api';
import { PaginatedResponse } from '@/types';

export interface ScanJob {
  _id: string;
  networkId: string;
  type: 'discovery' | 'status_check' | 'deep_scan';
  status: 'queued' | 'running' | 'completed' | 'failed';
  triggeredBy: 'manual' | 'scheduled';
  startedAt: string;
  completedAt: string;
  results: { macAddress: string; ipAddress: string; hostname: string; isNew: boolean }[];
  createdAt: string;
}

export const scannerService = {
  discover: (networkId: string, type = 'discovery') =>
    api<ScanJob>('/api/v1/scanner/discover', { method: 'POST', body: JSON.stringify({ networkId, type }) }),
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<ScanJob>>(`/api/v1/scanner/jobs?page=${page}&limit=${limit}`),
  findById: (id: string) => api<ScanJob>(`/api/v1/scanner/jobs/${id}`),
};
