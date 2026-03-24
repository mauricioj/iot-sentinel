import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationRuleDto } from './dto/create-notification-rule.dto';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationRule } from './schemas/notification-rule.schema';
import { Notification, NotificationType } from './schemas/notification.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  // Rules
  async createRule(dto: CreateNotificationRuleDto): Promise<NotificationRule> {
    return this.repository.createRule(dto as any);
  }

  async findAllRules(page: number, limit: number): Promise<PaginatedResponseDto<NotificationRule>> {
    const { data, total } = await this.repository.findAllRules(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findRuleById(id: string): Promise<NotificationRule> {
    const rule = await this.repository.findRuleById(id);
    if (!rule) throw new NotFoundException('Notification rule not found');
    return rule;
  }

  async updateRule(id: string, dto: UpdateNotificationRuleDto): Promise<NotificationRule> {
    const rule = await this.repository.updateRule(id, dto as any);
    if (!rule) throw new NotFoundException('Notification rule not found');
    return rule;
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.repository.deleteRule(id);
    if (!rule) throw new NotFoundException('Notification rule not found');
  }

  // Notifications
  async emit(type: NotificationType, message: string, thingId?: string, ruleId?: string): Promise<Notification> {
    return this.repository.createNotification({ type, message, thingId: thingId as any, ruleId: ruleId as any, sentTo: ['in_app'] });
  }

  async findAllNotifications(page: number, limit: number): Promise<PaginatedResponseDto<Notification>> {
    const { data, total } = await this.repository.findAllNotifications(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.repository.markAsRead(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllAsRead(): Promise<void> {
    await this.repository.markAllAsRead();
  }

  async countUnread(): Promise<number> {
    return this.repository.countUnread();
  }
}
