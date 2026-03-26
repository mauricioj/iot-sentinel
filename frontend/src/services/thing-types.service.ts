import { api } from './api';
import { ThingTypeItem } from '@/types';

export const thingTypesService = {
  findAll: () => api<ThingTypeItem[]>('/api/v1/thing-types'),
  findById: (id: string) => api<ThingTypeItem>(`/api/v1/thing-types/${id}`),
  create: (data: Partial<ThingTypeItem>) =>
    api<ThingTypeItem>('/api/v1/thing-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ThingTypeItem>) =>
    api<ThingTypeItem>(`/api/v1/thing-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api(`/api/v1/thing-types/${id}`, { method: 'DELETE' }),
};
