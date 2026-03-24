import { api } from './api';
import { Local, PaginatedResponse } from '@/types';

export const localsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Local>>(`/api/v1/locals?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Local>(`/api/v1/locals/${id}`),
  create: (data: Partial<Local>) =>
    api<Local>('/api/v1/locals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Local>) =>
    api<Local>(`/api/v1/locals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/locals/${id}`, { method: 'DELETE' }),
};
