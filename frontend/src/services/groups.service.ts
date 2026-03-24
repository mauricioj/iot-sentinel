import { api } from './api';
import { Group, Thing, PaginatedResponse } from '@/types';

export const groupsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<Group>>(`/api/v1/groups?page=${page}&limit=${limit}`),
  findById: (id: string) => api<Group>(`/api/v1/groups/${id}`),
  create: (data: Partial<Group>) =>
    api<Group>('/api/v1/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Group>) =>
    api<Group>(`/api/v1/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api(`/api/v1/groups/${id}`, { method: 'DELETE' }),
  getThings: (id: string, page = 1, limit = 20) =>
    api<PaginatedResponse<Thing>>(`/api/v1/groups/${id}/things?page=${page}&limit=${limit}`),
};
