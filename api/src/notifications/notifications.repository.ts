import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationRule, NotificationRuleDocument } from './schemas/notification-rule.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(NotificationRule.name) private readonly ruleModel: Model<NotificationRuleDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // Rules
  async createRule(data: Partial<NotificationRule>): Promise<NotificationRuleDocument> {
    return this.ruleModel.create({ ...data, targetId: new Types.ObjectId(data.targetId as any) });
  }

  async findAllRules(page: number, limit: number): Promise<{ data: NotificationRuleDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.ruleModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.ruleModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findRuleById(id: string): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findById(id).exec();
  }

  async updateRule(id: string, data: Partial<NotificationRule>): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteRule(id: string): Promise<NotificationRuleDocument | null> {
    return this.ruleModel.findByIdAndDelete(id).exec();
  }

  async findEnabledRules(): Promise<NotificationRuleDocument[]> {
    return this.ruleModel.find({ enabled: true }).exec();
  }

  // Notifications
  async createNotification(data: Partial<Notification>): Promise<NotificationDocument> {
    return this.notificationModel.create({
      ...data,
      thingId: data.thingId ? new Types.ObjectId(data.thingId as any) : undefined,
      ruleId: data.ruleId ? new Types.ObjectId(data.ruleId as any) : undefined,
    });
  }

  async findAllNotifications(page: number, limit: number): Promise<{ data: NotificationDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.notificationModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).exec(),
      this.notificationModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async markAsRead(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findByIdAndUpdate(id, { read: true }, { new: true }).exec();
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationModel.updateMany({ read: false }, { read: true }).exec();
  }

  async countUnread(): Promise<number> {
    return this.notificationModel.countDocuments({ read: false }).exec();
  }
}
