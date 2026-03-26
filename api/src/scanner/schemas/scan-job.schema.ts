import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScanJobDocument = HydratedDocument<ScanJob>;

export enum ScanType {
  DISCOVERY = 'discovery',
  STATUS_CHECK = 'status_check',
  DEEP_SCAN = 'deep_scan',
}

export enum ScanStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ScanTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

@Schema({ _id: false })
export class DiscoveredPort {
  @Prop({ required: true })
  port: number;

  @Prop({ default: 'tcp' })
  protocol: string;

  @Prop({ default: '' })
  service: string;

  @Prop({ default: '' })
  version: string;
}

@Schema({ _id: false })
export class DiscoveredHost {
  @Prop({ default: '' })
  macAddress: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ default: '' })
  hostname: string;

  @Prop({ default: '' })
  vendor: string;

  @Prop({ default: '' })
  os: string;

  @Prop({ type: [DiscoveredPort], default: [] })
  ports: DiscoveredPort[];

  @Prop({ default: false })
  isNew: boolean;
}

@Schema({ timestamps: true })
export class ScanJob {
  @Prop({ type: Types.ObjectId, ref: 'Network', required: true })
  networkId: Types.ObjectId;

  @Prop({ required: true, enum: ScanType })
  type: ScanType;

  @Prop({ required: true, enum: ScanStatus, default: ScanStatus.QUEUED })
  status: ScanStatus;

  @Prop({ required: true, enum: ScanTrigger })
  triggeredBy: ScanTrigger;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId: Types.ObjectId | null;

  @Prop({ type: Date })
  startedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: [DiscoveredHost], default: [] })
  results: DiscoveredHost[];

  @Prop({ default: '' })
  error: string;

  createdAt: Date;
}

export const ScanJobSchema = SchemaFactory.createForClass(ScanJob);
ScanJobSchema.index({ networkId: 1, status: 1 });
