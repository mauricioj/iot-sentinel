import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ThingTypeDocument = HydratedDocument<ThingType>;

@Schema({ _id: false })
export class ThingTypeCapabilities {
  @Prop({ default: false })
  enableChannels: boolean;

  @Prop({ default: false })
  enablePortScan: boolean;

  @Prop({ default: false })
  enableCredentials: boolean;
}

@Schema({ timestamps: true })
export class ThingType {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ default: 'help-circle' })
  icon: string;

  @Prop({ default: '#94a3b8' })
  color: string;

  @Prop({ type: ThingTypeCapabilities, default: () => ({}) })
  capabilities: ThingTypeCapabilities;

  @Prop({ default: false })
  isSystem: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ThingTypeSchema = SchemaFactory.createForClass(ThingType);
