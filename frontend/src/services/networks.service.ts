import { api } from './api';
import { Network, PaginatedResponse } from '@/types';

export const networksService = {
  findByLocal: (localId: string, page = 1, limit = 20) =>
    api<PaginatedResponse<Network>>(`/api/v1/locals/${localId}/networks?page=${page}&limit=${limit}`),
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Network>>(`/api/v1/networks?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Network>(`/api/v1/networks/${id}`),
  create: (localId: string, data: Partial<Network>) =>
    api<Network>(`/api/v1/locals/${localId}/networks`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Network>) =>
    api<Network>(`/api/v1/networks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/networks/${id}`, { method: 'DELETE' }),
};
