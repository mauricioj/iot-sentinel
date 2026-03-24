import { api } from './api';
import { Thing, PaginatedResponse } from '@/types';

export const thingsService = {
  findAll: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ page: '1', limit: '20', ...params }).toString();
    return api<PaginatedResponse<Thing>>(`/api/v1/things?${query}`);
  },
  findById: (id: string) => api<Thing>(`/api/v1/things/${id}`),
  create: (data: Partial<Thing>) =>
    api<Thing>('/api/v1/things', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Thing>) =>
    api<Thing>(`/api/v1/things/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/things/${id}`, { method: 'DELETE' }),
  deleteDiscovered: () => api<{ deleted: number }>('/api/v1/things/discovered', { method: 'DELETE' }),
};
