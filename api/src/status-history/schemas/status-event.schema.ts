import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StatusEventDocument = HydratedDocument<StatusEvent>;

@Schema()
export class StatusEvent {
  @Prop({ type: Types.ObjectId, ref: 'Thing', required: true, index: true })
  thingId: Types.ObjectId;

  @Prop({ required: true })
  healthStatus: string;

  @Prop({ required: true })
  timestamp: Date;
}

export const StatusEventSchema = SchemaFactory.createForClass(StatusEvent);
// TTL: auto-delete after 30 days
StatusEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Compound index for per-device time-range queries
StatusEventSchema.index({ thingId: 1, timestamp: -1 });
