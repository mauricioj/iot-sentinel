import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  THING_OFFLINE = 'thing_offline',
  THING_ONLINE = 'thing_online',
  NEW_DISCOVERY = 'new_discovery',
  SCAN_FAILED = 'scan_failed',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'NotificationRule' })
  ruleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Thing' })
  thingId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: [String], default: [] })
  sentTo: string[];

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ createdAt: -1 });
