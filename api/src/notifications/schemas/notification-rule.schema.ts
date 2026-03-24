import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationRuleDocument = HydratedDocument<NotificationRule>;

export enum TargetType { THING = 'thing', GROUP = 'group', NETWORK = 'network', LOCAL = 'local' }
export enum RuleCondition { OFFLINE_DURATION = 'offline_duration', STATUS_CHANGE = 'status_change', NEW_DISCOVERY = 'new_discovery' }

@Schema({ timestamps: true })
export class NotificationRule {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: TargetType })
  targetType: TargetType;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ required: true, enum: RuleCondition })
  condition: RuleCondition;

  @Prop({ default: 300 })
  threshold: number;

  @Prop({ type: [String], default: ['in_app'] })
  channels: string[];

  @Prop({ default: true })
  enabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationRuleSchema = SchemaFactory.createForClass(NotificationRule);
