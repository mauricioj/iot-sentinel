import { api } from './api';
import { PaginatedResponse } from '@/types';

export interface NotificationItem {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  thingId?: string;
  createdAt: string;
}

export interface NotificationRule {
  _id: string;
  name: string;
  targetType: string;
  targetId: string;
  condition: string;
  threshold: number;
  channels: string[];
  enabled: boolean;
}

export const notificationsService = {
  findAll: (page = 1, limit = 20) =>
    api<PaginatedResponse<NotificationItem>>(`/api/v1/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id: string) =>
    api(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () =>
    api('/api/v1/notifications/read-all', { method: 'POST' }),
  countUnread: () =>
    api<number>('/api/v1/notifications/unread-count'),
  // Rules
  findAllRules: (page = 1, limit = 20) =>
    api<PaginatedResponse<NotificationRule>>(`/api/v1/notifications/rules?page=${page}&limit=${limit}`),
  createRule: (data: Partial<NotificationRule>) =>
    api<NotificationRule>('/api/v1/notifications/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: Partial<NotificationRule>) =>
    api<NotificationRule>(`/api/v1/notifications/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRule: (id: string) =>
    api(`/api/v1/notifications/rules/${id}`, { method: 'DELETE' }),
};
