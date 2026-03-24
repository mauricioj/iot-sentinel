import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ThingDocument = HydratedDocument<Thing>;

export enum ThingType {
  CAMERA = 'camera',
  SWITCH = 'switch',
  SENSOR = 'sensor',
  NVR = 'nvr',
  VM = 'vm',
  SERVICE = 'service',
  PLC = 'plc',
  OTHER = 'other',
}

export enum ThingStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
  DISCOVERED = 'discovered',
}

export enum ChannelDirection {
  INPUT = 'input',
  OUTPUT = 'output',
  BIDIRECTIONAL = 'bidirectional',
}

export enum ChannelType {
  LIGHT = 'light',
  MOTOR = 'motor',
  SENSOR = 'sensor',
  RELAY = 'relay',
  CAMERA = 'camera',
  PORT = 'port',
  OTHER = 'other',
}

@Schema({ _id: false })
export class Port {
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
export class Channel {
  @Prop({ required: true })
  number: number;

  @Prop({ required: true, enum: ChannelDirection })
  direction: ChannelDirection;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ChannelType, default: ChannelType.OTHER })
  type: ChannelType;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  icon: string;
}

@Schema({ _id: false })
export class Credentials {
  @Prop({ default: '' })
  username: string;

  @Prop({ default: '' })
  password: string;

  @Prop({ default: '' })
  notes: string;
}

@Schema({ timestamps: true })
export class Thing {
  @Prop({ type: Types.ObjectId, ref: 'Network', index: true })
  networkId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Group' }], default: [], index: true })
  groupIds: Types.ObjectId[];

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: ThingType, default: ThingType.OTHER })
  type: ThingType;

  @Prop({ trim: true })
  macAddress: string;

  @Prop({ default: '' })
  ipAddress: string;

  @Prop({ default: '' })
  hostname: string;

  @Prop({ enum: ThingStatus, default: ThingStatus.UNKNOWN, index: true })
  status: ThingStatus;

  @Prop({ type: Date })
  lastSeenAt: Date;

  @Prop({ type: [Port], default: [] })
  ports: Port[];

  @Prop({ type: [Channel], default: [] })
  channels: Channel[];

  @Prop({ type: Credentials, default: () => ({}) })
  credentials: Credentials;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

export const ThingSchema = SchemaFactory.createForClass(Thing);
ThingSchema.index({ macAddress: 1 }, { unique: true, sparse: true });
